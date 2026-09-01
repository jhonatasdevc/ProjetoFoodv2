"use client";

const PREFIXO = "delivery.indicacao.loja.";

// Guarda quem indicou essa loja pro cliente (via /loja/{arroba}?ref={codigo}), por
// loja — usado no checkout pra mandar junto com o pedido (codigoIndicacao).
export function salvarIndicacao(idLoja: number, codigo: string) {
  try {
    localStorage.setItem(`${PREFIXO}${idLoja}`, codigo);
  } catch {
    // localStorage indisponível (modo privado etc.) — indicação simplesmente não é rastreada.
  }
}

export function lerIndicacao(idLoja: number): string | null {
  try {
    return localStorage.getItem(`${PREFIXO}${idLoja}`);
  } catch {
    return null;
  }
}

export function limparIndicacao(idLoja: number) {
  try {
    localStorage.removeItem(`${PREFIXO}${idLoja}`);
  } catch {
    // ignore
  }
}
