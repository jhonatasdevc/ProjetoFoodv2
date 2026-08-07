import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PedidoStatus } from "@delivery/shared";
import { prisma } from "../prisma.js";
import { exigirAuthLoja, exigirAuthUsuario } from "../auth.js";
import { serializePedido } from "../serializers.js";
import { emitirPedidoAtualizado, emitirPedidoCriado } from "../socket.js";
import { validarCupom } from "./cupom.js";

const criarPedidoSchema = z.object({
  idLoja: z.number().int(),
  idEndereco: z.number().int(),
  cupomCodigo: z.string().optional(),
  formaPagamento: z.enum(["dinheiro", "pix", "cartao_credito", "cartao_debito"]),
  observacoes: z.string().optional(),
  itens: z
    .array(
      z.object({
        idItem: z.number().int(),
        quantidade: z.number().int().positive(),
        observacao: z.string().optional(),
        complementos: z.array(z.object({ idItemComplemento: z.number().int() })).optional(),
      }),
    )
    .min(1),
});

const PEDIDO_INCLUDE = {
  loja: { select: { nome: true } },
  itens: { include: { item: true, complementos: { include: { itemComplemento: true } } } },
} as const;

const PROXIMO_STATUS: Record<PedidoStatus, PedidoStatus | null> = {
  recebido: "preparando",
  preparando: "saiu_entrega",
  saiu_entrega: "entregue",
  entregue: null,
  cancelado: null,
};

export default async function pedidoRoutes(app: FastifyInstance) {
  // Criação do pedido — exige cliente logado (endereço salvo + dados vêm do usuário autenticado).
  app.post("/pedidos", { preHandler: exigirAuthUsuario }, async (req, reply) => {
    const parsed = criarPedidoSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });
    }
    const input = parsed.data;

    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.idUsuario } });
    if (!usuario) return reply.code(404).send({ erro: "Usuário não encontrado" });

    const loja = await prisma.loja.findUnique({ where: { id: input.idLoja } });
    if (!loja || !loja.ativo) return reply.code(404).send({ erro: "Loja não encontrada" });

    const endereco = await prisma.endereco.findUnique({ where: { id: input.idEndereco } });
    if (!endereco || endereco.idUsuario !== usuario.id) {
      return reply.code(403).send({ erro: "Endereço inválido" });
    }

    const idsItens = input.itens.map((i) => i.idItem);
    const itensDb = await prisma.item.findMany({
      where: { id: { in: idsItens }, categoria: { idLoja: input.idLoja } },
      include: { complementos: true },
    });
    if (itensDb.length !== new Set(idsItens).size) {
      return reply.code(400).send({ erro: "Um ou mais itens não pertencem a essa loja" });
    }
    const itemById = new Map(itensDb.map((i) => [i.id, i]));

    let total = 0;
    const pedidoItensData = input.itens.map((linha) => {
      const item = itemById.get(linha.idItem)!;
      // Preço promocional (se houver) prevalece — nunca confiar em preço vindo do cliente.
      const precoCobrado = item.precoPromocional ?? item.preco;
      const precoUnitario = Number(precoCobrado);
      const complementosSelecionados = (linha.complementos ?? []).map((c) => {
        const comp = item.complementos.find((ic) => ic.id === c.idItemComplemento);
        if (!comp) throw new Error("Complemento inválido");
        return { idItemComplemento: comp.id, precoAdicional: comp.precoAdicional };
      });
      const totalComplementos = complementosSelecionados.reduce((s, c) => s + Number(c.precoAdicional), 0);
      total += (precoUnitario + totalComplementos) * linha.quantidade;

      return {
        idItem: item.id,
        quantidade: linha.quantidade,
        precoUnitario: precoCobrado,
        observacao: linha.observacao,
        complementos: { create: complementosSelecionados },
      };
    });

    let idCupom: number | undefined;
    let valorDesconto = 0;
    if (input.cupomCodigo) {
      const resultado = await validarCupom(input.cupomCodigo, total);
      if (!resultado.valido) return reply.code(400).send({ erro: resultado.erro });
      idCupom = resultado.idCupom;
      valorDesconto = Math.min(resultado.valorDesconto, total);
    }

    const enderecoTexto = `${endereco.rua}, ${endereco.numero}${endereco.complemento ? ` - ${endereco.complemento}` : ""} - ${endereco.cidade}/${endereco.estado} - CEP ${endereco.cep}`;

    const valorFrete = loja.freteGratis ? 0 : Number(loja.valorFrete ?? 0);

    const pedido = await prisma.pedido.create({
      data: {
        idLoja: input.idLoja,
        idUsuario: usuario.id,
        idEndereco: endereco.id,
        idCupom,
        clienteNome: `${usuario.nome} ${usuario.sobrenome}`,
        clienteTelefone: usuario.telefone,
        enderecoTexto,
        formaPagamento: input.formaPagamento,
        observacoes: input.observacoes,
        total: total - valorDesconto + valorFrete,
        valorDesconto,
        valorFrete,
        itens: { create: pedidoItensData },
        statusHistorico: { create: { status: "recebido" } },
      },
      include: PEDIDO_INCLUDE,
    });

    const serializado = serializePedido(pedido);
    emitirPedidoCriado(pedido.idLoja, serializado);
    return reply.code(201).send(serializado);
  });

  // Detalhe do pedido — público, usado pra tela de acompanhamento do cliente.
  app.get("/pedidos/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const pedido = await prisma.pedido.findUnique({ where: { id }, include: PEDIDO_INCLUDE });
    if (!pedido) return reply.code(404).send({ erro: "Pedido não encontrado" });
    return serializePedido(pedido);
  });

  // Histórico do cliente logado — usado pra "Últimas Lojas" (home) e aba Pedidos.
  app.get("/usuarios/me/pedidos", { preHandler: exigirAuthUsuario }, async (req) => {
    const pedidos = await prisma.pedido.findMany({
      where: { idUsuario: req.usuario!.idUsuario },
      include: PEDIDO_INCLUDE,
      orderBy: { criadoEm: "desc" },
    });
    return pedidos.map(serializePedido);
  });

  // Listagem — protegido, painel da loja. Filtro opcional por status.
  app.get("/pedidos", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const { status } = req.query as { status?: string };
    const pedidos = await prisma.pedido.findMany({
      where: { idLoja: req.loja!.idLoja, ...(status ? { status } : {}) },
      include: PEDIDO_INCLUDE,
      orderBy: { criadoEm: "desc" },
    });
    return pedidos.map(serializePedido);
  });

  // Avança o pedido pro próximo status do fluxo (ou aceita 'cancelado').
  app.patch("/pedidos/:id/status", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const bodySchema = z.object({ status: z.enum(["preparando", "saiu_entrega", "entregue", "cancelado"]) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Status inválido" });

    const pedidoAtual = await prisma.pedido.findUnique({ where: { id } });
    if (!pedidoAtual || pedidoAtual.idLoja !== req.loja!.idLoja) {
      return reply.code(404).send({ erro: "Pedido não encontrado" });
    }

    const statusAtual = pedidoAtual.status as PedidoStatus;
    const novoStatus = parsed.data.status;
    const podeAvancar = novoStatus === "cancelado" || PROXIMO_STATUS[statusAtual] === novoStatus;
    if (!podeAvancar) {
      return reply.code(400).send({
        erro: `Não é possível ir de '${statusAtual}' para '${novoStatus}'`,
      });
    }

    const pedido = await prisma.pedido.update({
      where: { id },
      data: {
        status: novoStatus,
        atualizadoEm: new Date(),
        statusHistorico: { create: { status: novoStatus } },
      },
      include: PEDIDO_INCLUDE,
    });

    const serializado = serializePedido(pedido);
    emitirPedidoAtualizado(pedido.idLoja, serializado);
    return serializado;
  });
}
