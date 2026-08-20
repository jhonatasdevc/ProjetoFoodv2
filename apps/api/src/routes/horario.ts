import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { exigirAuthLoja } from "../auth.js";
import { serializeFechamento, serializeHorario } from "../serializers.js";
import { lojaEstaAberta } from "../horario.js";

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário precisa estar no formato HH:MM")
  .nullable();

const horarioInputSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  abreEm: horaSchema,
  fechaEm: horaSchema,
  fechado: z.boolean(),
});

const fechamentoSchema = z
  .object({
    inicio: z.string().datetime(),
    fim: z.string().datetime(),
    motivo: z.string().max(200).optional(),
  })
  .refine((d) => new Date(d.fim) > new Date(d.inicio), { message: "fim precisa ser depois de inicio" });

export default async function horarioRoutes(app: FastifyInstance) {
  app.get("/loja/horarios", { preHandler: exigirAuthLoja }, async (req) => {
    const horarios = await prisma.horarioFuncionamento.findMany({
      where: { idLoja: req.loja!.idLoja },
    });
    // Sempre devolve os 7 dias, mesmo os que a loja nunca configurou.
    const porDia = new Map(horarios.map((h) => [h.diaSemana, h]));
    const completo = Array.from({ length: 7 }, (_, dia) =>
      serializeHorario(porDia.get(dia) ?? { diaSemana: dia, abreEm: null, fechaEm: null, fechado: true }),
    );

    const fechamentos = await prisma.fechamentoTemporario.findMany({ where: { idLoja: req.loja!.idLoja } });
    return { horarios: completo, abertaAgora: lojaEstaAberta(horarios, fechamentos) };
  });

  app.put("/loja/horarios", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const parsed = z.array(horarioInputSchema).length(7).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });

    const idLoja = req.loja!.idLoja;
    await prisma.$transaction(
      parsed.data.map((h) =>
        prisma.horarioFuncionamento.upsert({
          where: { idLoja_diaSemana: { idLoja, diaSemana: h.diaSemana } },
          create: { idLoja, diaSemana: h.diaSemana, abreEm: h.abreEm, fechaEm: h.fechaEm, fechado: h.fechado },
          update: { abreEm: h.abreEm, fechaEm: h.fechaEm, fechado: h.fechado },
        }),
      ),
    );

    const horarios = await prisma.horarioFuncionamento.findMany({ where: { idLoja } });
    return horarios.map(serializeHorario);
  });

  // Só devolve fechamentos que ainda não terminaram — os passados não interessam mais.
  app.get("/loja/fechamentos", { preHandler: exigirAuthLoja }, async (req) => {
    const fechamentos = await prisma.fechamentoTemporario.findMany({
      where: { idLoja: req.loja!.idLoja, fim: { gte: new Date() } },
      orderBy: { inicio: "asc" },
    });
    return fechamentos.map(serializeFechamento);
  });

  app.post("/loja/fechamentos", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const parsed = fechamentoSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });

    const fechamento = await prisma.fechamentoTemporario.create({
      data: {
        idLoja: req.loja!.idLoja,
        inicio: new Date(parsed.data.inicio),
        fim: new Date(parsed.data.fim),
        motivo: parsed.data.motivo,
      },
    });
    return reply.code(201).send(serializeFechamento(fechamento));
  });

  app.delete("/loja/fechamentos/:id", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const existente = await prisma.fechamentoTemporario.findUnique({ where: { id } });
    if (!existente || existente.idLoja !== req.loja!.idLoja) {
      return reply.code(404).send({ erro: "Fechamento não encontrado" });
    }
    await prisma.fechamentoTemporario.delete({ where: { id } });
    return reply.code(204).send();
  });
}
