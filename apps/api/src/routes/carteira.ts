import type { FastifyInstance } from "fastify";
import type { CarteiraResponse } from "@delivery/shared";
import { prisma } from "../prisma.js";
import { exigirAuthUsuario } from "../auth.js";

export default async function carteiraRoutes(app: FastifyInstance) {
  // Saldo de cashback do cliente logado, por loja — alimenta a aba Carteira no perfil e
  // o desconto automático oferecido no checkout.
  app.get("/usuarios/me/carteira", { preHandler: exigirAuthUsuario }, async (req): Promise<CarteiraResponse> => {
    const movimentos = await prisma.cashbackMovimento.findMany({
      where: { idUsuario: req.usuario!.idUsuario },
      include: { loja: { select: { nome: true, arroba: true } } },
    });

    const porLoja = new Map<number, { idLoja: number; lojaArroba: string; lojaNome: string; saldo: number }>();
    for (const m of movimentos) {
      const atual = porLoja.get(m.idLoja) ?? {
        idLoja: m.idLoja,
        lojaArroba: m.loja.arroba,
        lojaNome: m.loja.nome,
        saldo: 0,
      };
      atual.saldo += m.tipo === "credito" ? Number(m.valor) : -Number(m.valor);
      porLoja.set(m.idLoja, atual);
    }

    const saldosComCredito = Array.from(porLoja.values()).filter((s) => s.saldo > 0.005);
    const totalCashback = saldosComCredito.reduce((soma, s) => soma + s.saldo, 0);

    return { totalCashback, porLoja: saldosComCredito };
  });
}
