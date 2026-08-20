"use client";

import { useState } from "react";
import type { Item } from "@delivery/shared";
import { useCart } from "@/lib/cart-context";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ItemCard({ item, desabilitado }: { item: Item; desabilitado?: boolean }) {
  const { addItem } = useCart();
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState(1);
  const [complementosSelecionados, setComplementosSelecionados] = useState<number[]>([]);
  const [observacao, setObservacao] = useState("");

  if (!item.disponivel) return null;

  function toggleComplemento(id: number) {
    setComplementosSelecionados((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const precoCobrado = item.precoPromocional ?? item.preco;

  function handleAdicionar() {
    const complementos = item.complementos
      .filter((c) => complementosSelecionados.includes(c.id))
      .map((c) => ({ idItemComplemento: c.id, nome: c.nome, precoAdicional: c.precoAdicional }));

    addItem(
      { idItem: item.id, nome: item.nome, precoUnitario: precoCobrado, observacao: observacao || undefined, complementos },
      quantidade,
    );
    setAberto(false);
    setQuantidade(1);
    setComplementosSelecionados([]);
    setObservacao("");
  }

  return (
    <div className="border border-red-100 rounded-lg p-4 bg-white">
      <div className="flex justify-between gap-4">
        {item.imagemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imagemUrl} alt={item.nome} className="w-16 h-16 rounded object-cover shrink-0" />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{item.nome}</h3>
          {item.descricao && <p className="text-sm text-gray-600 mt-1">{item.descricao}</p>}
          {item.precoPromocional != null ? (
            <p className="mt-2">
              <span className="line-through text-gray-400 mr-2">{formatBRL(item.preco)}</span>
              <span className="text-red-600 font-semibold">{formatBRL(item.precoPromocional)}</span>
              <span className="ml-2 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">OFERTA</span>
            </p>
          ) : (
            <p className="text-red-600 font-semibold mt-2">{formatBRL(item.preco)}</p>
          )}
        </div>
        <button
          onClick={() => setAberto((v) => !v)}
          disabled={desabilitado}
          className="self-start shrink-0 rounded-full bg-red-600 text-white w-9 h-9 flex items-center justify-center hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600"
          aria-label={`Adicionar ${item.nome}`}
        >
          {aberto ? "×" : "+"}
        </button>
      </div>

      {aberto && (
        <div className="mt-4 border-t border-red-100 pt-4 space-y-3">
          {item.complementos.length > 0 && (
            <div className="space-y-2">
              {item.complementos
                .filter((c) => c.disponivel)
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={complementosSelecionados.includes(c.id)}
                      onChange={() => toggleComplemento(c.id)}
                      className="accent-red-600"
                    />
                    {c.nome} (+{formatBRL(c.precoAdicional)})
                  </label>
                ))}
            </div>
          )}

          <div>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observação (opcional) — ex: sem cebola"
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded border border-gray-300 text-gray-700"
            >
              −
            </button>
            <span>{quantidade}</span>
            <button
              onClick={() => setQuantidade((q) => q + 1)}
              className="w-7 h-7 rounded border border-gray-300 text-gray-700"
            >
              +
            </button>

            <button
              onClick={handleAdicionar}
              className="ml-auto bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
