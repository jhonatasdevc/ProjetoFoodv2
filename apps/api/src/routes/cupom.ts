import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ValidarCupomResponse } from "@delivery/shared";
import { prisma } from "../prisma.js";
import { exigirAuthAdmin, exigirAuthUsuario } from "../auth.js";
import { serializeCupom } from "../serializers.js";

const validarCupomSchema = z.object({
  codigo: z.string().min(1),
  subtotal: z.number().nonnegative(),
});

const novoCupomSchema = z.object({
  codigo: z.string().min(3),
  valorDesconto: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
  validoAte: z.string().datetime().optional(),
});

const editarCupomSchema = z.object({
  ativo: z.boolean().optional(),
  validoAte: z.string().datetime().nullable().optional(),
});

// Nunca confiar em desconto vindo do cliente — recalculado aqui e de novo em pedido.ts.
export async function validarCupom(codigo: string, subtotal: number): Promise<ValidarCupomResponse> {
  const cupom = await prisma.cupom.findUnique({ where: { codigo: codigo.toUpperCase() } });
  if (!cupom || !cupom.ativo) {
    return { valido: false, erro: "Cupom inválido" };
  }
  if (cupom.validoAte && cupom.validoAte < new Date()) {
    return { valido: false, erro: "Cupom expirado" };
  }

  const valor = Number(cupom.valorDesconto);
  const valorDesconto =
    cupom.tipoDesconto === "percentual" ? (subtotal * valor) / 100 : Math.min(valor, subtotal);

  return { valido: true, idCupom: cupom.id, valorDesconto };
}

export default async function cupomRoutes(app: FastifyInstance) {
  app.post("/cupons/validar", { preHandler: exigirAuthUsuario }, async (req, reply) => {
    const parsed = validarCupomSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    // 200 sempre — cupom inválido é um resultado esperado (valido:false), não erro de servidor.
    return validarCupom(parsed.data.codigo, parsed.data.subtotal);
  });

  // Público — alimenta a aba Ofertas do web-cliente.
  app.get("/cupons/ativos", async () => {
    const cupons = await prisma.cupom.findMany({
      where: { ativo: true, OR: [{ validoAte: null }, { validoAte: { gte: new Date() } }] },
      orderBy: { criadoEm: "desc" },
    });
    return cupons.map(serializeCupom);
  });

  // ---- Admin (protegido) ----
  app.get("/admin/cupons", { preHandler: exigirAuthAdmin }, async () => {
    const cupons = await prisma.cupom.findMany({ orderBy: { criadoEm: "desc" } });
    return cupons.map(serializeCupom);
  });

  app.post("/admin/cupons", { preHandler: exigirAuthAdmin }, async (req, reply) => {
    const parsed = novoCupomSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });

    const cupom = await prisma.cupom
      .create({
        data: {
          codigo: parsed.data.codigo.toUpperCase(),
          tipoDesconto: "percentual",
          valorDesconto: parsed.data.valorDesconto,
          validoAte: parsed.data.validoAte ? new Date(parsed.data.validoAte) : undefined,
        },
      })
      .catch(() => null);
    if (!cupom) return reply.code(409).send({ erro: "Código já cadastrado" });
    return reply.code(201).send(serializeCupom(cupom));
  });

  app.put("/admin/cupons/:id", { preHandler: exigirAuthAdmin }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = editarCupomSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    const { validoAte, ...resto } = parsed.data;
    const cupom = await prisma.cupom
      .update({
        where: { id },
        data: { ...resto, ...(validoAte !== undefined ? { validoAte: validoAte ? new Date(validoAte) : null } : {}) },
      })
      .catch(() => null);
    if (!cupom) return reply.code(404).send({ erro: "Cupom não encontrado" });
    return serializeCupom(cupom);
  });
}
