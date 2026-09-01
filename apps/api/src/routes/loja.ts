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

const arrobaSchema = z
  .string()
  .regex(/^[a-z0-9_]{3,30}$/, "Use só letras minúsculas, números e underscore (3 a 30 caracteres)");

const atualizarLojaSchema = z.object({
  arroba: arrobaSchema.optional(),
  imagemUrl: z.string().url().nullable().optional(),
  imagemPerfilUrl: z.string().url().nullable().optional(),
  aceitaEntrega: z.boolean().optional(),
  tipoFrete: z.enum(["gratis", "pago"]).optional(),
  valorFrete: z.number().positive().nullable().optional(),
  aceitaRetirada: z.boolean().optional(),
  ativo: z.boolean().optional(),
});

export default async function lojaRoutes(app: FastifyInstance) {
  // GET público — usado pelo web-cliente pra montar a tela /loja/{arroba}
  app.get("/lojas/:id", async (req, reply) => {
    const arroba = (req.params as { id: string }).id;
    const loja = await prisma.loja.findFirst({
      where: { arroba },
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

  // PATCH protegido — a própria loja edita seus dados (foto de capa, foto de perfil, frete,
  // retirada e o próprio desbloqueio). Entrega e retirada não são exclusivas — a loja pode
  // aceitar as duas, mas precisa aceitar pelo menos uma. "ativo=true" só é aceito se nome,
  // as duas fotos e o modo de entrega já estiverem configurados — senão a loja fica
  // invisível pro cliente pra sempre por engano.
  app.patch("/loja/me", { preHandler: exigirAuthLoja }, async (req, reply) => {
    const parsed = atualizarLojaSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    const atual = await prisma.loja.findUnique({ where: { id: req.loja!.idLoja } });
    if (!atual) return reply.code(404).send({ erro: "Loja não encontrada" });

    const aceitaEntrega = parsed.data.aceitaEntrega !== undefined ? parsed.data.aceitaEntrega : atual.aceitaEntrega;
    const tipoFrete = parsed.data.tipoFrete !== undefined ? parsed.data.tipoFrete : atual.tipoFrete;
    const valorFrete = parsed.data.valorFrete !== undefined ? parsed.data.valorFrete : atual.valorFrete;
    const aceitaRetirada =
      parsed.data.aceitaRetirada !== undefined ? parsed.data.aceitaRetirada : atual.aceitaRetirada;

    if (!aceitaEntrega && !aceitaRetirada) {
      return reply.code(400).send({ erro: "A loja precisa aceitar entrega, retirada, ou as duas" });
    }

    if (parsed.data.ativo === true) {
      const imagemUrl = parsed.data.imagemUrl !== undefined ? parsed.data.imagemUrl : atual.imagemUrl;
      const imagemPerfilUrl =
        parsed.data.imagemPerfilUrl !== undefined ? parsed.data.imagemPerfilUrl : atual.imagemPerfilUrl;
      // "pago" exige um valor definido; "gratis" não precisa, e nenhum dos dois importa
      // se a loja não aceita entrega.
      const freteConfigurado = !aceitaEntrega || tipoFrete !== "pago" || valorFrete != null;

      if (!atual.nome || !imagemUrl || !imagemPerfilUrl || !freteConfigurado) {
        return reply.code(400).send({
          erro: "Complete o cadastro (foto de capa, foto de perfil e frete) antes de desbloquear a loja",
        });
      }
    }

    const loja = await prisma.loja
      .update({ where: { id: req.loja!.idLoja }, data: parsed.data })
      .catch(() => null);
    if (!loja) return reply.code(409).send({ erro: "Esse @ já está em uso por outra loja" });
    return serializeLoja(loja);
  });
}
