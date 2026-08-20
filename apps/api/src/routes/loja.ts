import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { assinarTokenLoja, exigirAuthLoja } from "../auth.js";
import { serializeLoja, serializeLojaComHorario } from "../serializers.js";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

const atualizarLojaSchema = z.object({
  imagemUrl: z.string().url().nullable().optional(),
  imagemPerfilUrl: z.string().url().nullable().optional(),
  tipoEntrega: z.enum(["gratis", "pago", "retirada"]).optional(),
  valorFrete: z.number().positive().nullable().optional(),
  ativo: z.boolean().optional(),
});

export default async function lojaRoutes(app: FastifyInstance) {
  // GET público — usado pelo web-cliente pra montar a tela /loja/{id}
  app.get("/lojas/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const loja = await prisma.loja.findUnique({
      where: { id },
      include: { horarios: true, fechamentos: true },
    });
    if (!loja || !loja.ativo) {
      return reply.code(404).send({ erro: "Loja não encontrada" });
    }
    return serializeLojaComHorario(loja);
  });

  app.post("/loja/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });
    }
    const { email, senha } = parsed.data;

    const loja = await prisma.loja.findUnique({ where: { email } });
    if (!loja || !(await bcrypt.compare(senha, loja.senhaHash))) {
      return reply.code(401).send({ erro: "Email ou senha inválidos" });
    }

    const token = assinarTokenLoja({ idLoja: loja.id, email: loja.email });
    return { token, loja: serializeLoja(loja) };
  });

  // GET protegido — a própria loja consultando seus dados após login
  app.get("/loja/me", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const loja = await prisma.loja.findUnique({ where: { id: req.loja!.idLoja } });
    if (!loja) return reply.code(404).send({ erro: "Loja não encontrada" });
    return serializeLoja(loja);
  });

  // PATCH protegido — a própria loja edita seus dados (foto de capa, foto de perfil, frete
  // e o próprio desbloqueio). "ativo=true" só é aceito se nome, as duas fotos e o frete
  // (grátis ou com valor definido) já estiverem configurados — senão a loja fica invisível
  // pro cliente pra sempre por engano.
  app.patch("/loja/me", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const parsed = atualizarLojaSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    if (parsed.data.ativo === true) {
      const atual = await prisma.loja.findUnique({ where: { id: req.loja!.idLoja } });
      if (!atual) return reply.code(404).send({ erro: "Loja não encontrada" });

      const imagemUrl = parsed.data.imagemUrl !== undefined ? parsed.data.imagemUrl : atual.imagemUrl;
      const imagemPerfilUrl =
        parsed.data.imagemPerfilUrl !== undefined ? parsed.data.imagemPerfilUrl : atual.imagemPerfilUrl;
      const tipoEntrega = parsed.data.tipoEntrega !== undefined ? parsed.data.tipoEntrega : atual.tipoEntrega;
      const valorFrete = parsed.data.valorFrete !== undefined ? parsed.data.valorFrete : atual.valorFrete;
      // "pago" exige um valor definido; "gratis"/"retirada" não precisam de valor nenhum.
      const freteConfigurado = tipoEntrega !== "pago" || valorFrete != null;

      if (!atual.nome || !imagemUrl || !imagemPerfilUrl || !freteConfigurado) {
        return reply.code(400).send({
          erro: "Complete o cadastro (foto de capa, foto de perfil e frete) antes de desbloquear a loja",
        });
      }
    }

    const loja = await prisma.loja.update({ where: { id: req.loja!.idLoja }, data: parsed.data });
    return serializeLoja(loja);
  });
}
