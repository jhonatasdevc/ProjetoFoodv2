"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Grupo, Loja } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../../protected-route";
import { editarLojaAdmin, listGruposAdmin, listLojasAdmin } from "@/lib/api";

function EditarLojaContent({ id }: { id: number }) {
  const { auth } = useAuth();
  const router = useRouter();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loja, setLoja] = useState<Loja | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [idGrupo, setIdGrupo] = useState<number | null>(null);
  const [ativo, setAtivo] = useState(true);
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!auth) return;
    Promise.all([listLojasAdmin(auth.token), listGruposAdmin(auth.token)]).then(([lojas, gruposResp]) => {
      setGrupos(gruposResp);
      const atual = lojas.find((l) => l.id === id) ?? null;
      setLoja(atual);
      if (atual) {
        setNome(atual.nome);
        setTelefone(atual.telefone ?? "");
        setEndereco(atual.endereco ?? "");
        setIdGrupo(atual.idGrupo);
        setAtivo(atual.ativo);
      }
    });
  }, [auth, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setErro(null);
    setEnviando(true);
    try {
      await editarLojaAdmin(auth.token, id, {
        nome,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
        idGrupo: idGrupo ?? undefined,
        ativo,
        senha: novaSenha || undefined,
      });
      router.push("/restaurantes");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setEnviando(false);
    }
  }

  if (!loja) return <main className="flex-1 p-6 text-gray-500 text-sm">Carregando...</main>;

  return (
    <main className="flex-1 p-6 max-w-lg mx-auto w-full">
      <h1 className="text-xl font-bold text-red-600 mb-6">Editar restaurante</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nome</label>
          <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Telefone</label>
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Endereço</label>
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Grupo (tipo de comida)</label>
          <select
            value={idGrupo ?? ""}
            onChange={(e) => setIdGrupo(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nova senha (deixe em branco pra manter)</label>
          <input
            minLength={6}
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="accent-red-600" />
          Loja ativa
        </label>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-green-600 text-white font-semibold py-3 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {enviando ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </main>
  );
}

export default function EditarLojaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute>
      <EditarLojaContent id={Number(id)} />
    </ProtectedRoute>
  );
}
