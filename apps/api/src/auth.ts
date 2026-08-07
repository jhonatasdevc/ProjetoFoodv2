import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-troque-em-producao";

export interface LojaTokenPayload {
  idLoja: number;
  email: string;
}

export interface UsuarioTokenPayload {
  idUsuario: number;
  telefone: string;
}

export interface AdminTokenPayload {
  idAdmin: number;
  email: string;
}

export function assinarTokenLoja(payload: LojaTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function assinarTokenUsuario(payload: UsuarioTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function assinarTokenAdmin(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

declare module "fastify" {
  interface FastifyRequest {
    loja?: LojaTokenPayload;
    usuario?: UsuarioTokenPayload;
    admin?: AdminTokenPayload;
  }
}

function extrairToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

export async function exigirAuthLoja(req: FastifyRequest, reply: FastifyReply) {
  const token = extrairToken(req);
  if (!token) {
    return reply.code(401).send({ erro: "Token não informado" });
  }
  try {
    req.loja = jwt.verify(token, JWT_SECRET) as LojaTokenPayload;
  } catch {
    return reply.code(401).send({ erro: "Token inválido ou expirado" });
  }
}

export async function exigirAuthUsuario(req: FastifyRequest, reply: FastifyReply) {
  const token = extrairToken(req);
  if (!token) {
    return reply.code(401).send({ erro: "Token não informado" });
  }
  try {
    req.usuario = jwt.verify(token, JWT_SECRET) as UsuarioTokenPayload;
  } catch {
    return reply.code(401).send({ erro: "Token inválido ou expirado" });
  }
}

export async function exigirAuthAdmin(req: FastifyRequest, reply: FastifyReply) {
  const token = extrairToken(req);
  if (!token) {
    return reply.code(401).send({ erro: "Token não informado" });
  }
  try {
    req.admin = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return reply.code(401).send({ erro: "Token inválido ou expirado" });
  }
}
