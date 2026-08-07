import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma.js";
import { exigirAuthLoja } from "../auth.js";

const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default async function uploadRoutes(app: FastifyInstance) {
  // Upload de imagem (foto de capa da loja ou foto de produto) — guardada no banco.
  app.post("/uploads", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const file = await req.file().catch(() => null);
    if (!file) return reply.code(400).send({ erro: "Nenhum arquivo enviado" });
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      return reply.code(400).send({ erro: "Formato de imagem não suportado (use JPEG, PNG, WEBP ou GIF)" });
    }

    const buffer = await file.toBuffer().catch(() => null);
    if (!buffer) return reply.code(400).send({ erro: "Arquivo muito grande (máx. 5MB)" });

    const imagem = await prisma.imagem.create({ data: { dados: buffer, tipo: file.mimetype } });
    const base = `${req.protocol}://${req.headers.host}`;
    return reply.code(201).send({ url: `${base}/api/uploads/${imagem.id}` });
  });

  // Serve a imagem — público, referenciado diretamente em <img src>.
  app.get("/uploads/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const imagem = await prisma.imagem.findUnique({ where: { id } });
    if (!imagem) return reply.code(404).send();

    reply.header("Content-Type", imagem.tipo);
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(imagem.dados);
  });
}
