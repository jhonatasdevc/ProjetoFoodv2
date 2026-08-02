import "./env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import lojaRoutes from "./routes/loja.js";
import cardapioRoutes from "./routes/cardapio.js";
import pedidoRoutes from "./routes/pedido.js";
import { initSocket } from "./socket.js";

const PORT = Number(process.env.API_PORT ?? 3333);
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? "http://localhost:3001,http://localhost:3002").split(",");

const app = Fastify({ logger: true });

await app.register(cors, { origin: CORS_ORIGIN });

app.get("/health", async () => ({ ok: true }));

await app.register(lojaRoutes, { prefix: "/api" });
await app.register(cardapioRoutes, { prefix: "/api" });
await app.register(pedidoRoutes, { prefix: "/api" });

await app.ready();
initSocket(app.server, CORS_ORIGIN);

await app.listen({ port: PORT, host: "0.0.0.0" });
app.log.info(`API + Socket.io rodando em http://localhost:${PORT}`);
