import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-troque-em-producao";

export interface LojaTokenPayload {
  idLoja: number;
  email: string;
}

export function assinarTokenLoja(payload: LojaTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

declare module "fastify" {
  interface FastifyRequest {
    loja?: LojaTokenPayload;
  }
}

export async function exigirAuthLoja(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ erro: "Token não informado" });
  }

  try {
    req.loja = jwt.verify(token, JWT_SECRET) as LojaTokenPayload;
  } catch {
    return reply.code(401).send({ erro: "Token inválido ou expirado" });
  }
}
