import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { StoriesLoja } from "@delivery/shared";
import { prisma } from "../prisma.js";
import { exigirAuthLoja } from "../auth.js";
import { serializeStory } from "../serializers.js";

const VINTE_QUATRO_HORAS_MS = 24 * 60 * 60 * 1000;
const MAX_LOJAS_NA_HOME = 10;

const novoStorySchema = z.object({
  imagemUrl: z.string().url(),
});

function desde24h() {
  return new Date(Date.now() - VINTE_QUATRO_HORAS_MS);
}

export default async function storyRoutes(app: FastifyInstance) {
  // Público — alimenta a fileira de stories na home do web-cliente.
  app.get("/stories", async () => {
    const stories = await prisma.story.findMany({
      where: { criadoEm: { gte: desde24h() } },
      include: { loja: { select: { arroba: true, nome: true, imagemUrl: true } } },
      orderBy: { criadoEm: "asc" },
    });

    const porLoja = new Map<number, StoriesLoja>();
    for (const s of stories) {
      if (!porLoja.has(s.idLoja) && porLoja.size >= MAX_LOJAS_NA_HOME) continue;
      const grupo = porLoja.get(s.idLoja) ?? {
        idLoja: s.idLoja,
        lojaArroba: s.loja.arroba,
        lojaNome: s.loja.nome,
        lojaImagemUrl: s.loja.imagemUrl,
        stories: [],
      };
      grupo.stories.push(serializeStory(s));
      porLoja.set(s.idLoja, grupo);
    }
    return Array.from(porLoja.values());
  });

  // ---- Painel da loja (protegido) ----
  app.get("/loja/stories", { preHandler: exigirAuthLoja }, async (req) => {
    const stories = await prisma.story.findMany({
      where: { idLoja: req.loja!.idLoja, criadoEm: { gte: desde24h() } },
      orderBy: { criadoEm: "desc" },
    });
    return stories.map(serializeStory);
  });

  app.post("/loja/stories", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const parsed = novoStorySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    const story = await prisma.story.create({
      data: { idLoja: req.loja!.idLoja, imagemUrl: parsed.data.imagemUrl },
    });
    return reply.code(201).send(serializeStory(story));
  });

  app.delete("/loja/stories/:id", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const story = await prisma.story.findUnique({ where: { id } });
    if (!story || story.idLoja !== req.loja!.idLoja) {
      return reply.code(404).send({ erro: "Story não encontrado" });
    }
    await prisma.story.delete({ where: { id } });
    return reply.code(204).send();
  });
}
