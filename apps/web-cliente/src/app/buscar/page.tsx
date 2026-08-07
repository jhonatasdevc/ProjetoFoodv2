"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Grupo } from "@delivery/shared";
import { getGrupos } from "@/lib/api";

export default function BuscarPage() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getGrupos()
      .then(setGrupos)
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar categorias"));
  }, []);

  if (erro) return <p className="p-6 text-center text-red-600">{erro}</p>;
  if (!grupos) return <p className="p-6 text-center text-gray-500">Carregando...</p>;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-4">
      <h1 className="text-xl font-bold text-red-600 mb-4">Buscar por categoria</h1>
      <div className="grid grid-cols-2 gap-3">
        {grupos.map((grupo) => (
          <Link
            key={grupo.id}
            href={`/buscar/${grupo.id}`}
            className="border border-red-100 rounded-lg p-6 text-center font-semibold text-gray-900 hover:bg-red-50"
          >
            {grupo.nome}
          </Link>
        ))}
      </div>
      {grupos.length === 0 && <p className="text-center text-gray-500">Nenhuma categoria cadastrada.</p>}
    </main>
  );
}
