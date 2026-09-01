import { prisma } from "./prisma.js";

// Soma os lançamentos de cashback (crédito - débito) de um cliente numa loja — não
// guardamos um saldo separado, o extrato é a fonte de verdade.
export async function saldoCashback(idUsuario: number, idLoja: number): Promise<number> {
  const movimentos = await prisma.cashbackMovimento.findMany({
    where: { idUsuario, idLoja },
    select: { tipo: true, valor: true },
  });
  return movimentos.reduce((soma, m) => soma + (m.tipo === "credito" ? Number(m.valor) : -Number(m.valor)), 0);
}
