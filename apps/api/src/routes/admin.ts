import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { assinarTokenAdmin, exigirAuthAdmin } from "../auth.js";
import { serializeAdmin, serializeLoja } from "../serializers.js";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

const arrobaSchema = z
  .string()
  .regex(/^[a-z0-9_]{3,30}$/, "Use só letras minúsculas, números e underscore (3 a 30 caracteres)");

const novaLojaSchema = z.object({
  nome: z.string().min(1),
  arroba: arrobaSchema,
  email: z.string().email(),
  senha: z.string().min(6),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  idGrupo: z.number().int(),
});

const editarLojaSchema = z.object({
  nome: z.string().min(1).optional(),
  arroba: arrobaSchema.optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  idGrupo: z.number().int().optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(6).optional(),
});

export default async function adminRoutes(app: FastifyInstance) {
  app.post("/admin/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });
    }
    const { email, senha } = parsed.data;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !(await bcrypt.compare(senha, admin.senhaHash))) {
      return reply.code(401).send({ erro: "Email ou senha inválidos" });
    }

    const token = assinarTokenAdmin({ idAdmin: admin.id, email: admin.email });
    return { token, admin: serializeAdmin(admin) };
  });

  app.get("/admin/me", { preHandler: exigirAuthAdmin }, async (req, reply) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.admin!.idAdmin } });
    if (!admin) return reply.code(404).send({ erro: "Admin não encontrado" });
    return serializeAdmin(admin);
  });

  app.get("/admin/lojas", { preHandler: exigirAuthAdmin }, async () => {
    const lojas = await prisma.loja.findMany({ orderBy: { nome: "asc" } });
    return lojas.map(serializeLoja);
  });

  app.post("/admin/lojas", { preHandler: exigirAuthAdmin }, async (req, reply) => {
    const parsed = novaLojaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });
    }
    const { senha, ...dados } = parsed.data;
    const senhaHash = await bcrypt.hash(senha, 10);

    const loja = await prisma.loja.create({ data: { ...dados, senhaHash } }).catch(() => null);
    if (!loja) return reply.code(409).send({ erro: "Email ou @ já cadastrado" });
    return reply.code(201).send(serializeLoja(loja));
  });

  app.put("/admin/lojas/:id", { preHandler: exigirAuthAdmin }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = editarLojaSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    const { senha, ...dados } = parsed.data;
    const senhaHash = senha ? await bcrypt.hash(senha, 10) : undefined;

    let conflito = false;
    const loja = await prisma.loja
      .update({ where: { id }, data: { ...dados, ...(senhaHash ? { senhaHash } : {}) } })
      .catch((err) => {
        if ((err as { code?: string }).code === "P2002") conflito = true;
        return null;
      });
    if (conflito) return reply.code(409).send({ erro: "Esse @ já está em uso por outra loja" });
    if (!loja) return reply.code(404).send({ erro: "Loja não encontrada" });
    return serializeLoja(loja);
  });
}
