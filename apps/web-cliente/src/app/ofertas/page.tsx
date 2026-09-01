"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Cupom, Grupo, Loja } from "@delivery/shared";
import { getCuponsAtivos, getGrupos } from "@/lib/api";

export default function OfertasPage() {
  const [cupons, setCupons] = useState<Cupom[] | null>(null);
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);

  useEffect(() => {
    getCuponsAtivos().then(setCupons);
    getGrupos().then(setGrupos);
  }, []);

  if (cupons === null) return <p className="p-6 text-center text-gray-500">Carregando...</p>;

  if (cupons.length === 0) {
    return (
      <main className="flex-1 max-w-2xl mx-auto w-full p-6 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Ofertas</h1>
        <p className="text-gray-500">Nenhuma oferta disponível no momento.</p>
      </main>
    );
  }

  const lojas: Loja[] = grupos ? grupos.flatMap((g) => g.lojas) : [];

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-4">
      <h1 className="text-xl font-bold text-red-600 mb-4">Ofertas</h1>

      <div className="space-y-2 mb-6">
        {cupons.map((cupom) => (
          <div key={cupom.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">
              Use o cupom <span className="font-mono">{cupom.codigo}</span> e ganhe {cupom.valorDesconto}% de desconto
            </p>
          </div>
        ))}
      </div>

      {grupos === null ? (
        <p className="text-center text-gray-500">Carregando restaurantes...</p>
      ) : (
        <div className="space-y-2">
          {lojas.map((loja) => (
            <Link key={loja.id} href={`/loja/${loja.arroba}`} className="block border border-red-100 rounded-lg p-4 hover:bg-red-50">
              <p className="font-semibold text-gray-900">{loja.nome}</p>
              {loja.endereco && <p className="text-sm text-gray-500">{loja.endereco}</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
