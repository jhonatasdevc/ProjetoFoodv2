import type { FastifyInstance } from "fastify";

// Webhook do WhatsApp Business API (Meta) — dois propósitos:
// 1. GET: handshake de verificação que a Meta faz uma vez, ao cadastrar a URL do webhook
//    no painel do app. Só responde com sucesso se o verify_token bater com o nosso.
// 2. POST: eventos que a Meta envia depois (mensagens recebidas, status de entrega etc.)
//    — por enquanto só loga, sem processar nada (fase de teste inicial da integração).
export default async function whatsappRoutes(app: FastifyInstance) {
  app.get("/whatsapp/webhook", async (req, reply) => {
    const query = req.query as Record<string, string>;
    const modo = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) {
      app.log.warn("WHATSAPP_VERIFY_TOKEN não configurado — recusando verificação do webhook");
      return reply.code(403).send();
    }

    if (modo === "subscribe" && token === verifyToken) {
      app.log.info("Webhook do WhatsApp verificado com sucesso pela Meta");
      return reply.code(200).send(challenge);
    }

    return reply.code(403).send();
  });

  app.post("/whatsapp/webhook", async (req, reply) => {
    app.log.info({ body: req.body }, "Evento recebido do webhook do WhatsApp");
    // Confirma recebimento rápido — a Meta reenvia o evento se não responder 200 a tempo.
    return reply.code(200).send();
  });
}
