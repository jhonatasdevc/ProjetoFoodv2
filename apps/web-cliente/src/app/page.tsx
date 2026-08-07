"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Favorito, Loja, Pedido } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { getGrupos, getMeusPedidos, listFavoritos } from "@/lib/api";
import { StoriesRow } from "@/components/stories-row";

function saudacao() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

const CORES_CARD = [
  "from-red-500 to-red-700",
  "from-orange-500 to-orange-700",
  "from-amber-500 to-amber-700",
  "from-green-600 to-green-800",
  "from-teal-500 to-teal-700",
  "from-rose-500 to-rose-700",
];

function RestaurantesRow({ lojas }: { lojas: Loja[] }) {
  if (lojas.length === 0) return null;
  return (
    <section className="mb-8 -mx-4">
      <h2 className="text-lg font-semibold text-green-700 mb-3 px-4">Restaurantes</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
        {lojas.map((loja, i) => (
          <Link key={loja.id} href={`/loja/${loja.id}`} className="shrink-0 w-36 snap-start">
            <div
              className={`relative w-36 h-44 rounded-lg overflow-hidden bg-gradient-to-br ${CORES_CARD[i % CORES_CARD.length]}`}
            >
              {loja.imagemUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={loja.imagemUrl} alt={loja.nome} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
              <span className="absolute left-2 right-2 bottom-2 text-white font-semibold text-sm leading-tight">
                {loja.nome}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Cards pequenos e retangulares (paisagem), mesmo estilo visual do card de perfil da loja
// (imagem de fundo + gradiente + nome sobreposto), só que num formato mais compacto.
function UltimosPedidosRow({ pedidos, lojas }: { pedidos: Pedido[]; lojas: Loja[] }) {
  if (pedidos.length === 0) return null;
  const ultimos = pedidos.slice(0, 5);
  return (
    <section className="mb-8 -mx-4">
      <h2 className="text-lg font-semibold text-green-700 mb-3 px-4">Últimos Pedidos</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
        {ultimos.map((p) => {
          const loja = lojas.find((l) => l.id === p.idLoja);
          return (
            <Link key={p.id} href={`/loja/${p.idLoja}`} className="shrink-0 w-40 snap-start">
              <div className="relative w-40 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-gray-500 to-gray-700">
                {loja?.imagemUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={loja.imagemUrl} alt={p.lojaNome} className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute left-2 right-2 bottom-2 text-white font-semibold text-xs leading-tight truncate">
                  {p.lojaNome}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FavoritosRow({ favoritos }: { favoritos: Favorito[] }) {
  if (favoritos.length === 0) return null;
  return (
    <section className="mb-8 -mx-4">
      <h2 className="text-lg font-semibold text-green-700 mb-3 px-4">Favoritos</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
        {favoritos.map((f, i) => (
          <Link key={f.idLoja} href={`/loja/${f.idLoja}`} className="shrink-0 w-36 snap-start">
            <div
              className={`relative w-36 h-44 rounded-lg overflow-hidden bg-gradient-to-br ${CORES_CARD[i % CORES_CARD.length]}`}
            >
              {f.lojaImagemUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.lojaImagemUrl} alt={f.lojaNome} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
              <span className="absolute left-2 right-2 bottom-2 text-white font-semibold text-sm leading-tight">
                {f.lojaNome}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { auth } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);

  useEffect(() => {
    if (!auth) return;
    getMeusPedidos(auth.token).then(setPedidos);
    listFavoritos(auth.token).then(setFavoritos);
  }, [auth]);

  useEffect(() => {
    getGrupos().then((grupos) => setLojas(grupos.flatMap((g) => g.lojas)));
  }, []);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-4">
      {auth ? (
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          {saudacao()}, {auth.usuario.nome}
        </h1>
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-red-600">Para pedir é Eazy.</h1>
          <p className="text-gray-600 mt-1">Entre pra ver seu histórico, ou explore restaurantes na aba Buscar.</p>
        </div>
      )}

      <StoriesRow />

      <RestaurantesRow lojas={lojas} />

      <UltimosPedidosRow pedidos={pedidos ?? []} lojas={lojas} />

      {auth && pedidos !== null && pedidos.length === 0 && (
        <p className="text-gray-500 text-sm mb-6">Você ainda não fez nenhum pedido. Explore restaurantes na aba Buscar.</p>
      )}

      <FavoritosRow favoritos={favoritos} />
    </main>
  );
}
