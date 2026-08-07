"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Loja, Pedido } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { getGrupos, getMeusPedidos } from "@/lib/api";
import { StoriesRow } from "@/components/stories-row";

function saudacao() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

function ultimasLojas(pedidos: Pedido[]) {
  const vistos = new Set<number>();
  const resultado: Pedido[] = [];
  for (const p of pedidos) {
    if (vistos.has(p.idLoja)) continue;
    vistos.add(p.idLoja);
    resultado.push(p);
    if (resultado.length === 4) break;
  }
  return resultado;
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

export default function Home() {
  const { auth } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [lojas, setLojas] = useState<Loja[]>([]);

  useEffect(() => {
    if (!auth) return;
    getMeusPedidos(auth.token).then(setPedidos);
  }, [auth]);

  useEffect(() => {
    getGrupos().then((grupos) => setLojas(grupos.flatMap((g) => g.lojas)));
  }, []);

  const lojasRecentes = pedidos ? ultimasLojas(pedidos) : [];

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

      {auth && lojasRecentes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-green-700 mb-3">Últimas Lojas</h2>
          <div className="space-y-2">
            {lojasRecentes.map((p) => (
              <Link
                key={p.idLoja}
                href={`/loja/${p.idLoja}`}
                className="block border border-red-100 rounded-lg p-4 hover:bg-red-50"
              >
                <p className="font-semibold text-gray-900">{p.lojaNome}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {auth && pedidos !== null && lojasRecentes.length === 0 && (
        <p className="text-gray-500 text-sm mb-6">Você ainda não fez nenhum pedido. Explore restaurantes na aba Buscar.</p>
      )}

      <RestaurantesRow lojas={lojas} />
    </main>
  );
}
