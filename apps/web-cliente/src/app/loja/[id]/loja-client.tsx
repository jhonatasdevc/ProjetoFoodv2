"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CardapioResponse, TipoFrete } from "@delivery/shared";
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
  aceitaEntrega,
  tipoFrete,
  valorFrete,
  aceitaRetirada,
  enderecoLoja,
  fechada,
}: {
  idLoja: number;
  aceitaEntrega: boolean;
  tipoFrete: TipoFrete;
  valorFrete: number | null;
  aceitaRetirada: boolean;
  enderecoLoja: string | null;
  fechada: boolean;
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
          disabled={fechada}
          className="w-full max-w-md mx-auto flex justify-between items-center bg-red-600 text-white font-semibold py-3 px-5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
        >
          <span>
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </span>
          <span>{fechada ? "Loja fechada" : `Ver carrinho — ${formatBRL(total)}`}</span>
        </button>
      </div>
      {checkoutAberto && (
        <CheckoutForm
          idLoja={idLoja}
          aceitaEntrega={aceitaEntrega}
          tipoFrete={tipoFrete}
          valorFrete={valorFrete}
          aceitaRetirada={aceitaRetirada}
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
  const fechada = data.loja.abertaAgora === false;
  const destaques = data.categorias.flatMap((c) => c.itens).filter((i) => i.destaque && i.disponivel);

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
            {[
              data.loja.aceitaEntrega
                ? data.loja.tipoFrete === "gratis"
                  ? "Entrega grátis"
                  : data.loja.valorFrete != null
                    ? `Entrega ${formatBRL(data.loja.valorFrete)}`
                    : null
                : null,
              data.loja.aceitaRetirada ? "Retirada no local" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className={`text-sm mt-1 font-medium ${fechada ? "text-red-600" : "text-green-700"}`}>
            {fechada ? "Fechada no momento" : "Aberta agora"}
          </p>
        </div>
        <BotaoFavoritar idLoja={data.loja.id} />
      </header>

      {fechada && (
        <div className="mx-4 mb-4 border border-red-200 bg-red-50 text-red-700 text-sm rounded-lg p-3">
          Essa loja está fechada no momento. Você pode ver o cardápio, mas não é possível fazer pedidos agora.
        </div>
      )}

      {destaques.length > 0 && (
        <section className="px-4 mb-8">
          <h2 className="text-lg font-semibold text-green-700 mb-3">⭐ Destaques</h2>
          <div className="space-y-3">
            {destaques.map((item) => (
              <ItemCard key={item.id} item={item} desabilitado={fechada} />
            ))}
          </div>
        </section>
      )}

      <div className="px-4">
        {data.categorias.map((categoria) => (
          <section key={categoria.id} className="mb-8">
            <h2 className="text-lg font-semibold text-green-700 mb-3">{categoria.nome}</h2>
            <div className="space-y-3">
              {categoria.itens.map((item) => (
                <ItemCard key={item.id} item={item} desabilitado={fechada} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <CartBar
        idLoja={data.loja.id}
        aceitaEntrega={data.loja.aceitaEntrega}
        tipoFrete={data.loja.tipoFrete}
        valorFrete={data.loja.valorFrete}
        aceitaRetirada={data.loja.aceitaRetirada}
        enderecoLoja={data.loja.endereco}
        fechada={fechada}
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
