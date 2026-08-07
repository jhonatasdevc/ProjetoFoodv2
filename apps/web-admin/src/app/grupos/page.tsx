"use client";

import { useEffect, useState } from "react";
import type { Grupo } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { criarGrupo, editarGrupo, excluirGrupo, listGruposAdmin } from "@/lib/api";

function GruposContent() {
  const { auth } = useAuth();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    if (!auth) return;
    listGruposAdmin(auth.token).then(setGrupos);
  }

  useEffect(carregar, [auth]);

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setErro(null);
    try {
      await criarGrupo(auth.token, { nome, ordem: ordem ? Number(ordem) : undefined });
      setNome("");
      setOrdem("");
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar grupo");
    }
  }

  async function handleToggleAtivo(grupo: Grupo) {
    if (!auth) return;
    await editarGrupo(auth.token, grupo.id, { ativo: !grupo.ativo });
    carregar();
  }

  async function handleExcluir(grupo: Grupo) {
    if (!auth) return;
    setErro(null);
    try {
      await excluirGrupo(auth.token, grupo.id);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir grupo");
    }
  }

  return (
    <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-bold text-red-600 mb-6">Grupos (tipo de comida)</h1>

      <form onSubmit={handleAdicionar} className="flex gap-2 mb-6">
        <input
          required
          placeholder="Nome do grupo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
        />
        <input
          placeholder="Ordem"
          type="number"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
          className="w-24 border border-gray-300 rounded px-3 py-2"
        />
        <button type="submit" className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700">
          + Novo
        </button>
      </form>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      <div className="space-y-2">
        {grupos.map((grupo) => (
          <div key={grupo.id} className="flex items-center justify-between border border-red-100 rounded-lg p-4">
            <div>
              <p className="font-semibold text-gray-900">{grupo.nome}</p>
              <p className="text-sm text-gray-500">ordem {grupo.ordem}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => handleToggleAtivo(grupo)} className={grupo.ativo ? "text-green-700" : "text-gray-400"}>
                {grupo.ativo ? "Ativo" : "Inativo"}
              </button>
              <button onClick={() => handleExcluir(grupo)} className="text-red-600 hover:text-red-800">
                Excluir
              </button>
            </div>
          </div>
        ))}
        {grupos.length === 0 && <p className="text-gray-500 text-sm">Nenhum grupo cadastrado.</p>}
      </div>
    </main>
  );
}

export default function GruposPage() {
  return (
    <ProtectedRoute>
      <GruposContent />
    </ProtectedRoute>
  );
}
