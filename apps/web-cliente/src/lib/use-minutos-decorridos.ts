"use client";

import { useEffect, useState } from "react";

function calcularMinutos(criadoEm: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(criadoEm).getTime()) / 60000));
}

// Atualiza a cada 30s — é "em minutos", não precisa de mais precisão que isso.
export function useMinutosDecorridos(criadoEm: string) {
  const [minutos, setMinutos] = useState(() => calcularMinutos(criadoEm));

  useEffect(() => {
    setMinutos(calcularMinutos(criadoEm));
    const intervalo = setInterval(() => setMinutos(calcularMinutos(criadoEm)), 30000);
    return () => clearInterval(intervalo);
  }, [criadoEm]);

  return minutos;
}
