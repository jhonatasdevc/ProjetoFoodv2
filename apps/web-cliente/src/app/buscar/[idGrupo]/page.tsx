"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { Grupo } from "@delivery/shared";
import { getGrupos } from "@/lib/api";

function GrupoContent({ idGrupo }: { idGrupo: number }) {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getGrupos()
      .then(setGrupos)
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar"));
  }, []);

  if (erro) return <p className="p-6 text-center text-red-600">{erro}</p>;
  if (!grupos) return <p className="p-6 text-center text-gray-500">Carregando...</p>;

  const grupo = grupos.find((g) => g.id === idGrupo);
  if (!grupo) return <p className="p-6 text-center text-red-600">Categoria não encontrada</p>;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-4">
      <h1 className="text-xl font-bold text-red-600 mb-4">{grupo.nome}</h1>
      <div className="space-y-2">
        {grupo.lojas.map((loja) => (
          <Link key={loja.id} href={`/loja/${loja.arroba}`} className="block border border-red-100 rounded-lg p-4 hover:bg-red-50">
            <p className="font-semibold text-gray-900">{loja.nome}</p>
            {loja.endereco && <p className="text-sm text-gray-500">{loja.endereco}</p>}
          </Link>
        ))}
        {grupo.lojas.length === 0 && <p className="text-sm text-gray-500">Nenhum restaurante nessa categoria ainda.</p>}
      </div>
    </main>
  );
}

export default function BuscarGrupoPage({ params }: { params: Promise<{ idGrupo: string }> }) {
  const { idGrupo } = use(params);
  return <GrupoContent idGrupo={Number(idGrupo)} />;
}
