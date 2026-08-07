"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartComplemento {
  idItemComplemento: number;
  nome: string;
  precoAdicional: number;
}

export interface CartLine {
  key: string;
  idItem: number;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  observacao?: string;
  complementos: CartComplemento[];
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (input: Omit<CartLine, "key" | "quantidade">, quantidade: number) => void;
  removeLine: (key: string) => void;
  changeQuantity: (key: string, quantidade: number) => void;
  clear: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(idItem: number, complementos: CartComplemento[], observacao?: string) {
  const ids = complementos.map((c) => c.idItemComplemento).sort().join("-");
  return `${idItem}:${ids}:${observacao ?? ""}`;
}

// Persistido no localStorage por loja: o checkout agora exige login, o que navega
// pra /login e de volta — sem isso o carrinho (em memória) se perderia nesse trajeto.
export function CartProvider({ idLoja, children }: { idLoja: number; children: ReactNode }) {
  const storageKey = `delivery.cart.${idLoja}`;

  const [lines, setLines] = useState<CartLine[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [storageKey, lines]);

  const addItem: CartContextValue["addItem"] = (input, quantidade) => {
    const key = lineKey(input.idItem, input.complementos, input.observacao);
    setLines((prev) => {
      const existente = prev.find((l) => l.key === key);
      if (existente) {
        return prev.map((l) => (l.key === key ? { ...l, quantidade: l.quantidade + quantidade } : l));
      }
      return [...prev, { ...input, key, quantidade }];
    });
  };

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const changeQuantity = (key: string, quantidade: number) => {
    if (quantidade <= 0) return removeLine(key);
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantidade } : l)));
  };

  const clear = () => setLines([]);

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const precoComplementos = l.complementos.reduce((s, c) => s + c.precoAdicional, 0);
        return sum + (l.precoUnitario + precoComplementos) * l.quantidade;
      }, 0),
    [lines],
  );

  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantidade, 0), [lines]);

  return (
    <CartContext.Provider value={{ lines, addItem, removeLine, changeQuantity, clear, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}
