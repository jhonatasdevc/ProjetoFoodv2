import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { SOCKET_EVENTS, type MensagemPedido, type Pedido } from "@delivery/shared";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer, corsOrigins: string[]) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigins },
  });

  io.on("connection", (socket) => {
    socket.on("loja:entrar", (idLoja: number) => {
      socket.join(`loja:${idLoja}`);
    });
  });

  return io;
}

export function emitirPedidoCriado(idLoja: number, pedido: Pedido) {
  io?.to(`loja:${idLoja}`).emit(SOCKET_EVENTS.PEDIDO_CRIADO, pedido);
}

export function emitirPedidoAtualizado(idLoja: number, pedido: Pedido) {
  io?.to(`loja:${idLoja}`).emit(SOCKET_EVENTS.PEDIDO_ATUALIZADO, pedido);
}

export function emitirMensagemNova(idLoja: number, mensagem: MensagemPedido) {
  io?.to(`loja:${idLoja}`).emit(SOCKET_EVENTS.MENSAGEM_NOVA, mensagem);
}
