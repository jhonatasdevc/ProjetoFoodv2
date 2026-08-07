"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Grupo, Loja } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { listGruposAdmin, listLojasAdmin } from "@/lib/api";

function RestaurantesContent() {
  const { auth } = useAuth();
  const [lojas, setLojas] = useState<Loja[] | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    Promise.all([listLojasAdmin(auth.token), listGruposAdmin(auth.token)])
      .then(([lojasResp, gruposResp]) => {
        setLojas(lojasResp);
        setGrupos(gruposResp);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar"));
  }, [auth]);

  function nomeGrupo(idGrupo: number) {
    return grupos.find((g) => g.id === idGrupo)?.nome ?? "—";
  }

  return (
    <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-red-600">Restaurantes</h1>
        <Link href="/restaurantes/novo" className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700">
          + Nova loja
        </Link>
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      {!lojas && !erro && <p className="text-gray-500 text-sm">Carregando...</p>}

      <div className="space-y-2">
        {lojas?.map((loja) => (
          <Link
            key={loja.id}
            href={`/restaurantes/${loja.id}`}
            className="flex items-center justify-between border border-red-100 rounded-lg p-4 hover:bg-red-50"
          >
            <div>
              <p className="font-semibold text-gray-900">{loja.nome}</p>
              <p className="text-sm text-gray-600">{loja.email} · {nomeGrupo(loja.idGrupo)}</p>
            </div>
            <span className={loja.ativo ? "text-green-700 text-sm" : "text-amber-600 text-sm"}>
              {loja.ativo ? "Desbloqueada" : "Bloqueada"}
            </span>
          </Link>
        ))}
        {lojas?.length === 0 && <p className="text-gray-500 text-sm">Nenhum restaurante cadastrado.</p>}
      </div>
    </main>
  );
}

export default function RestaurantesPage() {
  return (
    <ProtectedRoute>
      <RestaurantesContent />
    </ProtectedRoute>
  );
}
