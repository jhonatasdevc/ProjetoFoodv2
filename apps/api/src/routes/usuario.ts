import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { assinarTokenUsuario, exigirAuthUsuario } from "../auth.js";
import { serializeEndereco, serializeUsuario } from "../serializers.js";

const OTP_VALIDADE_MINUTOS = 5;

const solicitarOtpSchema = z.object({ telefone: z.string().min(8) });

const verificarOtpSchema = z.object({
  telefone: z.string().min(8),
  codigo: z.string().length(6),
  nome: z.string().min(1).optional(),
  sobrenome: z.string().min(1).optional(),
});

const perfilSchema = z.object({
  nome: z.string().min(1).optional(),
  sobrenome: z.string().min(1).optional(),
});

const enderecoSchema = z.object({
  cep: z.string().min(1),
  cidade: z.string().min(1),
  estado: z.string().length(2),
  rua: z.string().min(1),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  referencia: z.string().optional(),
  padrao: z.boolean().optional(),
});

async function definirComoPadrao(idUsuario: number, idEndereco: number) {
  await prisma.$transaction([
    prisma.endereco.updateMany({ where: { idUsuario }, data: { padrao: false } }),
    prisma.endereco.update({ where: { id: idEndereco }, data: { padrao: true } }),
  ]);
}

export default async function usuarioRoutes(app: FastifyInstance) {
  // Gera um código de 6 dígitos. Nesta versão o OTP é mockado — sem gateway de SMS,
  // o código volta na própria resposta (mesmo espírito do pagamento mockado do MVP).
  app.post("/usuarios/otp/solicitar", async (req, reply) => {
    const parsed = solicitarOtpSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Telefone inválido" });
    const { telefone } = parsed.data;

    await prisma.otpCodigo.deleteMany({ where: { telefone, usado: false } });
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expiraEm = new Date(Date.now() + OTP_VALIDADE_MINUTOS * 60 * 1000);
    await prisma.otpCodigo.create({ data: { telefone, codigo, expiraEm } });

    return { enviado: true, codigoDev: codigo };
  });

  app.post("/usuarios/otp/verificar", async (req, reply) => {
    const parsed = verificarOtpSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });
    const { telefone, codigo, nome, sobrenome } = parsed.data;

    const otp = await prisma.otpCodigo.findFirst({
      where: { telefone, codigo, usado: false, expiraEm: { gt: new Date() } },
      orderBy: { criadoEm: "desc" },
    });
    if (!otp) return reply.code(401).send({ erro: "Código inválido ou expirado" });

    let usuario = await prisma.usuario.findUnique({ where: { telefone }, include: { enderecos: true } });

    if (!usuario && (!nome || !sobrenome)) {
      // Código ainda válido — o cliente reenvia com nome/sobrenome pra completar o cadastro.
      return { precisaCadastro: true };
    }

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: { telefone, nome: nome!, sobrenome: sobrenome! },
        include: { enderecos: true },
      });
    }

    await prisma.otpCodigo.update({ where: { id: otp.id }, data: { usado: true } });

    const token = assinarTokenUsuario({ idUsuario: usuario.id, telefone: usuario.telefone });
    return { precisaCadastro: false, token, usuario: serializeUsuario(usuario) };
  });

  app.get("/usuarios/me", { preHandler: exigirAuthUsuario }, async (req, reply) => {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.idUsuario },
      include: { enderecos: true },
    });
    if (!usuario) return reply.code(404).send({ erro: "Usuário não encontrado" });
    return serializeUsuario(usuario);
  });

  app.patch("/usuarios/me", { preHandler: exigirAuthUsuario }, async (req, reply) => {
    const parsed = perfilSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    const usuario = await prisma.usuario.update({
      where: { id: req.usuario!.idUsuario },
      data: parsed.data,
      include: { enderecos: true },
    });
    return serializeUsuario(usuario);
  });

  app.get("/usuarios/me/enderecos", { preHandler: exigirAuthUsuario }, async (req) => {
    const enderecos = await prisma.endereco.findMany({
      where: { idUsuario: req.usuario!.idUsuario },
      orderBy: { criadoEm: "asc" },
    });
    return enderecos.map(serializeEndereco);
  });

  app.post("/usuarios/me/enderecos", { preHandler: exigirAuthUsuario }, async (req, reply) => {
    const parsed = enderecoSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos", detalhes: parsed.error.flatten() });

    const { padrao, ...dados } = parsed.data;
    const endereco = await prisma.endereco.create({
      data: { ...dados, idUsuario: req.usuario!.idUsuario, padrao: padrao ?? false },
    });
    if (padrao) await definirComoPadrao(req.usuario!.idUsuario, endereco.id);

    return reply.code(201).send(serializeEndereco({ ...endereco, padrao: padrao ?? endereco.padrao }));
  });

  app.put("/usuarios/me/enderecos/:id", { preHandler: exigirAuthUsuario }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const existente = await prisma.endereco.findUnique({ where: { id } });
    if (!existente || existente.idUsuario !== req.usuario!.idUsuario) {
      return reply.code(404).send({ erro: "Endereço não encontrado" });
    }
    const parsed = enderecoSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: "Dados inválidos" });

    const { padrao, ...dados } = parsed.data;
    const endereco = await prisma.endereco.update({ where: { id }, data: dados });
    if (padrao) await definirComoPadrao(req.usuario!.idUsuario, id);

    return serializeEndereco({ ...endereco, padrao: padrao ?? endereco.padrao });
  });

  app.delete("/usuarios/me/enderecos/:id", { preHandler: exigirAuthUsuario }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const existente = await prisma.endereco.findUnique({ where: { id } });
    if (!existente || existente.idUsuario !== req.usuario!.idUsuario) {
      return reply.code(404).send({ erro: "Endereço não encontrado" });
    }
    await prisma.endereco.delete({ where: { id } });
    return reply.code(204).send();
  });
}
