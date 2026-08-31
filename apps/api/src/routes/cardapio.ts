import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { exigirAuthLoja } from "../auth.js";
import { serializeCategoria, serializeItem, serializeLojaComHorario } from "../serializers.js";

const categoriaSchema = z.object({
  nome: z.string().min(1),
  ordem: z.number().int().optional(),
});

const itemSchema = z.object({
  idCategoria: z.number().int(),
  nome: z.string().min(1),
  descricao: z.string().optional(),
  preco: z.number().positive(),
  precoPromocional: z.number().positive().nullable().optional(),
  imagemUrl: z.string().url().nullable().optional(),
  disponivel: z.boolean().optional(),
  destaque: z.boolean().optional(),
  ordem: z.number().int().optional(),
});

const MAX_ITENS_DESTAQUE = 3;

async function categoriaPertenceALoja(idCategoria: number, idLoja: number) {
  const categoria = await prisma.categoria.findUnique({ where: { id: idCategoria } });
  return categoria?.idLoja === idLoja;
}

async function podeDestacar(idLoja: number, idItemAtual?: number) {
  const count = await prisma.item.count({
    where: { destaque: true, categoria: { idLoja }, ...(idItemAtual ? { id: { not: idItemAtual } } : {}) },
  });
  return count < MAX_ITENS_DESTAQUE;
}

export default async function cardapioRoutes(app: FastifyInstance) {
  // Cardápio completo (loja + categorias + itens + complementos) — usado pelo web-cliente
  app.get("/lojas/:id/cardapio", async (req, reply) => {
    const idLoja = Number((req.params as { id: string }).id);
    const loja = await prisma.loja.findUnique({
      where: { id: idLoja },
      include: { horarios: true, fechamentos: true },
    });
    if (!loja || !loja.ativo) return reply.code(404).send({ erro: "Loja não encontrada" });

    const categorias = await prisma.categoria.findMany({
      where: { idLoja },
      orderBy: { ordem: "asc" },
      include: { itens: { include: { complementos: true }, orderBy: { ordem: "asc" } } },
    });

    return {
      loja: serializeLojaComHorario(loja),
      categorias: categorias.map(serializeCategoria),
    };
  });

  // ---- CATEGORIA (protegido, painel da loja) ----
  app.post("/categorias", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const parsed = categoriaSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });

    const categoria = await prisma.categoria.create({
      data: { ...parsed.data, idLoja: req.loja!.idLoja },
      include: { itens: { include: { complementos: true } } },
    });
    return reply.code(201).send(serializeCategoria(categoria));
  });

  app.put("/categorias/:id", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!(await categoriaPertenceALoja(id, req.loja!.idLoja))) {
      return reply.code(404).send({ erro: "Categoria não encontrada" });
    }
    const parsed = categoriaSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    const categoria = await prisma.categoria.update({
      where: { id },
      data: parsed.data,
      include: { itens: { include: { complementos: true } } },
    });
    return serializeCategoria(categoria);
  });

  app.delete("/categorias/:id", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!(await categoriaPertenceALoja(id, req.loja!.idLoja))) {
      return reply.code(404).send({ erro: "Categoria não encontrada" });
    }
    await prisma.categoria.delete({ where: { id } });
    return reply.code(204).send();
  });

  // ---- ITEM (protegido, painel da loja) ----
  app.post("/itens", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const parsed = itemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });
    if (!(await categoriaPertenceALoja(parsed.data.idCategoria, req.loja!.idLoja))) {
      return reply.code(403).send({ erro: "Categoria não pertence a essa loja" });
    }
    if (parsed.data.destaque && !(await podeDestacar(req.loja!.idLoja))) {
      return reply.code(400).send({ erro: `Máximo de ${MAX_ITENS_DESTAQUE} itens em destaque` });
    }

    // Sem ordem explícita, entra no fim da categoria.
    const ordem =
      parsed.data.ordem ?? (await prisma.item.count({ where: { idCategoria: parsed.data.idCategoria } }));

    const item = await prisma.item.create({
      data: { ...parsed.data, ordem },
      include: { complementos: true },
    });
    return reply.code(201).send(serializeItem(item));
  });

  app.put("/itens/:id", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const existente = await prisma.item.findUnique({ where: { id }, include: { categoria: true } });
    if (!existente || existente.categoria.idLoja !== req.loja!.idLoja) {
      return reply.code(404).send({ erro: "Item não encontrado" });
    }
    const parsed = itemSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });
    if (parsed.data.destaque && !existente.destaque && !(await podeDestacar(req.loja!.idLoja))) {
      return reply.code(400).send({ erro: `Máximo de ${MAX_ITENS_DESTAQUE} itens em destaque` });
    }

    const item = await prisma.item.update({
      where: { id },
      data: parsed.data,
      include: { complementos: true },
    });
    return serializeItem(item);
  });

  app.delete("/itens/:id", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const existente = await prisma.item.findUnique({ where: { id }, include: { categoria: true } });
    if (!existente || existente.categoria.idLoja !== req.loja!.idLoja) {
      return reply.code(404).send({ erro: "Item não encontrado" });
    }
    await prisma.item.delete({ where: { id } });
    return reply.code(204).send();
  });
}
