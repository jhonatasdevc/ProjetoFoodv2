import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PedidoStatus } from "@delivery/shared";
import { prisma } from "../prisma.js";
import { exigirAuthLoja } from "../auth.js";
import { serializePedido } from "../serializers.js";
import { emitirPedidoAtualizado, emitirPedidoCriado } from "../socket.js";

const criarPedidoSchema = z.object({
  idLoja: z.number().int(),
  clienteNome: z.string().min(1),
  clienteTelefone: z.string().min(1),
  enderecoTexto: z.string().min(1),
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
  // Criação do pedido — público, chamado pelo web-cliente no checkout.
  app.post("/pedidos", async (req, reply) => {
    const parsed = criarPedidoSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });
    }
    const input = parsed.data;

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
      const precoUnitario = Number(item.preco);
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
        precoUnitario: item.preco,
        observacao: linha.observacao,
        complementos: { create: complementosSelecionados },
      };
    });

    const pedido = await prisma.pedido.create({
      data: {
        idLoja: input.idLoja,
        clienteNome: input.clienteNome,
        clienteTelefone: input.clienteTelefone,
        enderecoTexto: input.enderecoTexto,
        formaPagamento: input.formaPagamento,
        observacoes: input.observacoes,
        total,
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
