import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { assinarTokenLoja, exigirAuthLoja } from "../auth.js";
import { serializeLoja } from "../serializers.js";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export default async function lojaRoutes(app: FastifyInstance) {
  // GET público — usado pelo web-cliente pra montar a tela /loja/{id}
  app.get("/lojas/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const loja = await prisma.loja.findUnique({ where: { id } });
    if (!loja || !loja.ativo) {
      return reply.code(404).send({ erro: "Loja não encontrada" });
    }
    return serializeLoja(loja);
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
}
