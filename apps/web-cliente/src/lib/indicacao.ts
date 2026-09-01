"use client";

const PREFIXO = "delivery.indicacao.loja.";

// Guarda quem indicou essa loja pro cliente (via /loja/{arroba}?ref={idUsuario}), por
// loja — usado no checkout pra mandar junto com o pedido (codigoIndicacao).
export function salvarIndicacao(idLoja: number, idUsuarioIndicador: number) {
  try {
    localStorage.setItem(`${PREFIXO}${idLoja}`, String(idUsuarioIndicador));
  } catch {
    // localStorage indisponível (modo privado etc.) — indicação simplesmente não é rastreada.
  }
}

export function lerIndicacao(idLoja: number): number | null {
  try {
    const valor = localStorage.getItem(`${PREFIXO}${idLoja}`);
    return valor ? Number(valor) : null;
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
