"use client";

import { useEffect, useState } from "react";
import type { CardapioResponse } from "@delivery/shared";
import { getCardapio } from "@/lib/api";
import { CartProvider, useCart } from "@/lib/cart-context";
import { ItemCard } from "./item-card";
import { CheckoutForm } from "./checkout-form";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CartBar({ idLoja }: { idLoja: number }) {
  const { itemCount, total } = useCart();
  const [checkoutAberto, setCheckoutAberto] = useState(false);

  if (itemCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-red-100 z-10">
        <button
          onClick={() => setCheckoutAberto(true)}
          className="w-full max-w-md mx-auto flex justify-between items-center bg-red-600 text-white font-semibold py-3 px-5 rounded-lg hover:bg-red-700"
        >
          <span>
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </span>
          <span>Ver carrinho — {formatBRL(total)}</span>
        </button>
      </div>
      {checkoutAberto && <CheckoutForm idLoja={idLoja} onClose={() => setCheckoutAberto(false)} />}
    </>
  );
}

function Cardapio({ data }: { data: CardapioResponse }) {
  return (
    <div className="max-w-2xl mx-auto pb-40">
      {data.loja.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.loja.imagemUrl} alt={data.loja.nome} className="w-full h-40 object-cover" />
      )}
      <header className="mb-6 p-4 pb-0">
        <h1 className="text-2xl font-bold text-gray-900">{data.loja.nome}</h1>
        {data.loja.endereco && <p className="text-sm text-gray-500 mt-1">{data.loja.endereco}</p>}
      </header>

      <div className="px-4">
        {data.categorias.map((categoria) => (
          <section key={categoria.id} className="mb-8">
            <h2 className="text-lg font-semibold text-green-700 mb-3">{categoria.nome}</h2>
            <div className="space-y-3">
              {categoria.itens.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <CartBar idLoja={data.loja.id} />
    </div>
  );
}

export function LojaClient({ idLoja }: { idLoja: string }) {
  const [data, setData] = useState<CardapioResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getCardapio(idLoja)
      .then(setData)
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar loja"));
  }, [idLoja]);

  if (erro) {
    return <p className="p-6 text-center text-red-600">{erro}</p>;
  }

  if (!data) {
    return <p className="p-6 text-center text-gray-500">Carregando cardápio...</p>;
  }

  return (
    <CartProvider idLoja={data.loja.id}>
      <Cardapio data={data} />
    </CartProvider>
  );
}
