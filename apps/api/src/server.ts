import "./env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import lojaRoutes from "./routes/loja.js";
import cardapioRoutes from "./routes/cardapio.js";
import pedidoRoutes from "./routes/pedido.js";
import grupoRoutes from "./routes/grupo.js";
import usuarioRoutes from "./routes/usuario.js";
import cupomRoutes from "./routes/cupom.js";
import adminRoutes from "./routes/admin.js";
import uploadRoutes from "./routes/upload.js";
import storyRoutes from "./routes/story.js";
import horarioRoutes from "./routes/horario.js";
import mensagemRoutes from "./routes/mensagem.js";
import { initSocket } from "./socket.js";
import { configurarWebPush } from "./push.js";

const PORT = Number(process.env.API_PORT ?? 3333);
const CORS_ORIGIN = (
  process.env.CORS_ORIGIN ?? "http://localhost:3001,http://localhost:3002,http://localhost:3003"
).split(",");

configurarWebPush();

const app = Fastify({ logger: true });

await app.register(cors, { origin: CORS_ORIGIN });
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

app.get("/health", async () => ({ ok: true }));

await app.register(lojaRoutes, { prefix: "/api" });
await app.register(cardapioRoutes, { prefix: "/api" });
await app.register(pedidoRoutes, { prefix: "/api" });
await app.register(grupoRoutes, { prefix: "/api" });
await app.register(usuarioRoutes, { prefix: "/api" });
await app.register(cupomRoutes, { prefix: "/api" });
await app.register(adminRoutes, { prefix: "/api" });
await app.register(uploadRoutes, { prefix: "/api" });
await app.register(storyRoutes, { prefix: "/api" });
await app.register(horarioRoutes, { prefix: "/api" });
await app.register(mensagemRoutes, { prefix: "/api" });

await app.ready();
initSocket(app.server, CORS_ORIGIN);

await app.listen({ port: PORT, host: "0.0.0.0" });
app.log.info(`API + Socket.io rodando em http://localhost:${PORT}`);
