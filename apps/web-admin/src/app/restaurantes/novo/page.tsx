"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Grupo } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../../protected-route";
import { criarLojaAdmin, listGruposAdmin } from "@/lib/api";

function NovaLojaContent() {
  const { auth } = useAuth();
  const router = useRouter();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [idGrupo, setIdGrupo] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!auth) return;
    listGruposAdmin(auth.token).then((resp) => {
      setGrupos(resp);
      if (resp.length > 0) setIdGrupo(resp[0].id);
    });
  }, [auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !idGrupo) return;
    setErro(null);
    setEnviando(true);
    try {
      await criarLojaAdmin(auth.token, {
        nome,
        email,
        senha,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
        idGrupo,
      });
      router.push("/restaurantes");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar restaurante");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex-1 p-6 max-w-lg mx-auto w-full">
      <h1 className="text-xl font-bold text-red-600 mb-6">Novo restaurante</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nome</label>
          <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Email (login da loja)</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Senha inicial</label>
          <input required minLength={6} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
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
            required
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

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-green-600 text-white font-semibold py-3 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {enviando ? "Criando..." : "Criar restaurante"}
        </button>
      </form>
    </main>
  );
}

export default function NovaLojaPage() {
  return (
    <ProtectedRoute>
      <NovaLojaContent />
    </ProtectedRoute>
  );
}
