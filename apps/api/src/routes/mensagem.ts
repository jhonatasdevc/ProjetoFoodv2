import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { STATUS_PEDIDO_EM_ANDAMENTO, type PedidoStatus } from "@delivery/shared";
import { prisma } from "../prisma.js";
import { exigirAuthLojaOuUsuario } from "../auth.js";
import { serializeMensagem } from "../serializers.js";
import { emitirMensagemNova } from "../socket.js";
import { enviarPushParaUsuario } from "../push.js";

const novaMensagemSchema = z.object({ texto: z.string().trim().min(1).max(1000) });

async function buscarPedidoDoRemetente(idPedido: number, req: { usuario?: { idUsuario: number }; loja?: { idLoja: number } }) {
  const pedido = await prisma.pedido.findUnique({ where: { id: idPedido } });
  if (!pedido) return { pedido: null, remetente: null } as const;

  if (req.usuario && pedido.idUsuario === req.usuario.idUsuario) {
    return { pedido, remetente: "cliente" as const };
  }
  if (req.loja && pedido.idLoja === req.loja.idLoja) {
    return { pedido, remetente: "loja" as const };
  }
  return { pedido: null, remetente: null } as const;
}

export default async function mensagemRoutes(app: FastifyInstance) {
  app.get("/pedidos/:id/mensagens", { preHandler: exigirAuthLojaOuUsuario }, async (req, reply) => {
    const idPedido = Number((req.params as { id: string }).id);
    const { pedido } = await buscarPedidoDoRemetente(idPedido, req);
    if (!pedido) return reply.code(404).send({ erro: "Pedido não encontrado" });

    const mensagens = await prisma.pedidoMensagem.findMany({
      where: { idPedido },
      orderBy: { criadoEm: "asc" },
    });
    return mensagens.map(serializeMensagem);
  });

  app.post("/pedidos/:id/mensagens", { preHandler: exigirAuthLojaOuUsuario }, async (req, reply) => {
    const idPedido = Number((req.params as { id: string }).id);
    const parsed = novaMensagemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Mensagem inválida" });

    const { pedido, remetente } = await buscarPedidoDoRemetente(idPedido, req);
    if (!pedido || !remetente) return reply.code(404).send({ erro: "Pedido não encontrado" });
    if (!STATUS_PEDIDO_EM_ANDAMENTO.includes(pedido.status as PedidoStatus)) {
      return reply.code(400).send({ erro: "Esse pedido não está mais em andamento — chat encerrado" });
    }

    const mensagem = await prisma.pedidoMensagem.create({
      data: { idPedido, remetente, texto: parsed.data.texto },
    });
    const serializada = serializeMensagem(mensagem);
    if (remetente === "cliente") {
      emitirMensagemNova(pedido.idLoja, serializada);
    } else {
      const texto = parsed.data.texto;
      enviarPushParaUsuario(pedido.idUsuario, {
        titulo: "💬 A loja respondeu",
        corpo: texto.length > 100 ? `${texto.slice(0, 100)}…` : texto,
        url: `/pedido/${pedido.id}`,
        idPedido: pedido.id,
      }).catch(() => {});
    }
    return reply.code(201).send(serializada);
  });
}
