import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { exigirAuthAdmin } from "../auth.js";
import { serializeGrupo, serializeGrupoAdmin } from "../serializers.js";

const grupoSchema = z.object({
  nome: z.string().min(1),
  ordem: z.number().int().optional(),
});

export default async function grupoRoutes(app: FastifyInstance) {
  // Público — usado pela home do web-cliente (grupos + restaurantes ativos).
  app.get("/grupos", async () => {
    const grupos = await prisma.grupo.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      include: { lojas: { where: { ativo: true } } },
    });
    return grupos.map(serializeGrupo);
  });

  // ---- Admin (protegido) ----
  app.get("/admin/grupos", { preHandler: exigirAuthAdmin }, async () => {
    const grupos = await prisma.grupo.findMany({ orderBy: { ordem: "asc" } });
    return grupos.map(serializeGrupoAdmin);
  });

  app.post("/admin/grupos", { preHandler: exigirAuthAdmin }, async (req, reply) => {
    const parsed = grupoSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });

    const grupo = await prisma.grupo.create({ data: parsed.data });
    return reply.code(201).send(serializeGrupoAdmin(grupo));
  });

  app.put("/admin/grupos/:id", { preHandler: exigirAuthAdmin }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = grupoSchema.partial().extend({ ativo: z.boolean().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    const grupo = await prisma.grupo.update({ where: { id }, data: parsed.data }).catch(() => null);
    if (!grupo) return reply.code(404).send({ erro: "Grupo não encontrado" });
    return serializeGrupoAdmin(grupo);
  });

  app.delete("/admin/grupos/:id", { preHandler: exigirAuthAdmin }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const lojasVinculadas = await prisma.loja.count({ where: { idGrupo: id } });
    if (lojasVinculadas > 0) {
      return reply.code(400).send({ erro: "Grupo possui lojas vinculadas" });
    }
    await prisma.grupo.delete({ where: { id } }).catch(() => null);
    return reply.code(204).send();
  });
}
