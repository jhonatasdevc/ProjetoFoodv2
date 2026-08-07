"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CardapioResponse, TipoEntrega } from "@delivery/shared";
import { getCardapio } from "@/lib/api";
import { CartProvider, useCart } from "@/lib/cart-context";
import { useFavoritoLoja } from "@/lib/use-favorito";
import { ItemCard } from "./item-card";
import { CheckoutForm } from "./checkout-form";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CartBar({
  idLoja,
  tipoEntrega,
  valorFrete,
  enderecoLoja,
}: {
  idLoja: number;
  tipoEntrega: TipoEntrega;
  valorFrete: number | null;
  enderecoLoja: string | null;
}) {
  const { itemCount, total } = useCart();
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Volta do fluxo "cadastrar endereço" (a partir do checkout, sem endereço salvo ainda)
  // — reabre o carrinho automaticamente em vez de deixar o usuário ter que adicionar tudo de novo.
  useEffect(() => {
    if (searchParams.get("abrirCarrinho") === "1") {
      setCheckoutAberto(true);
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

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
      {checkoutAberto && (
        <CheckoutForm
          idLoja={idLoja}
          tipoEntrega={tipoEntrega}
          valorFrete={valorFrete}
          enderecoLoja={enderecoLoja}
          onClose={() => setCheckoutAberto(false)}
        />
      )}
    </>
  );
}

function BotaoFavoritar({ idLoja }: { idLoja: number }) {
  const router = useRouter();
  const { favoritado, alternar, carregando, logado } = useFavoritoLoja(idLoja);

  function handleClick() {
    if (!logado) {
      router.push(`/login?redirect=/loja/${idLoja}`);
      return;
    }
    alternar();
  }

  return (
    <button
      onClick={handleClick}
      disabled={carregando}
      className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border disabled:opacity-50 ${
        favoritado ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-300 text-gray-700 hover:border-red-400"
      }`}
    >
      <span aria-hidden>{favoritado ? "♥" : "♡"}</span>
      {favoritado ? "Favoritado" : "Salvar Favoritos"}
    </button>
  );
}

function Cardapio({ data }: { data: CardapioResponse }) {
  return (
    <div className="max-w-2xl mx-auto pb-40">
      {data.loja.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.loja.imagemUrl} alt={data.loja.nome} className="w-full h-40 object-cover" />
      )}
      <header className="mb-6 p-4 pb-0 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.loja.nome}</h1>
          {data.loja.endereco && <p className="text-sm text-gray-500 mt-1">{data.loja.endereco}</p>}
          <p className="text-sm text-green-700 mt-1">
            {data.loja.tipoEntrega === "gratis" && "Frete grátis"}
            {data.loja.tipoEntrega === "retirada" && "Clique e retire — sem entrega"}
            {data.loja.tipoEntrega === "pago" &&
              data.loja.valorFrete != null &&
              `Frete ${formatBRL(data.loja.valorFrete)}`}
          </p>
        </div>
        <BotaoFavoritar idLoja={data.loja.id} />
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

      <CartBar
        idLoja={data.loja.id}
        tipoEntrega={data.loja.tipoEntrega}
        valorFrete={data.loja.valorFrete}
        enderecoLoja={data.loja.endereco}
      />
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
