"use client";

import { useEffect, useState } from "react";
import type { Story } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { criarStory, excluirStory, listStories, uploadImagem } from "@/lib/api";

function tempoRestante(criadoEm: string) {
  const expiraEm = new Date(criadoEm).getTime() + 24 * 60 * 60 * 1000;
  const restanteMs = expiraEm - Date.now();
  if (restanteMs <= 0) return "expirado";
  const horas = Math.floor(restanteMs / (60 * 60 * 1000));
  const minutos = Math.floor((restanteMs % (60 * 60 * 1000)) / (60 * 1000));
  return `${horas}h ${minutos}min restantes`;
}

function StoriesContent() {
  const { auth } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    if (!auth) return;
    listStories(auth.token).then(setStories);
  }

  useEffect(carregar, [auth]);

  async function handleEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !auth) return;
    setErro(null);
    setEnviando(true);
    try {
      const { url } = await uploadImagem(auth.token, file);
      await criarStory(auth.token, { imagemUrl: url });
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar story");
    } finally {
      setEnviando(false);
    }
  }

  async function handleExcluir(id: number) {
    if (!auth) return;
    await excluirStory(auth.token, id);
    carregar();
  }

  return (
    <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-bold text-red-600 mb-2">Stories</h1>
      <p className="text-sm text-gray-500 mb-6">
        Aparecem na home do app do cliente em formato retangular e somem automaticamente 24 horas depois de
        publicados. Máx. 5MB por imagem.
      </p>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleEscolherArquivo}
        disabled={enviando}
        className="block text-sm mb-2"
      />
      {enviando && <p className="text-sm text-gray-400">Enviando...</p>}
      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="grid grid-cols-3 gap-4 mt-6">
        {stories.map((story) => (
          <div key={story.id} className="space-y-1">
            <div className="w-full aspect-[2/3] rounded-md overflow-hidden border border-red-100 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={story.imagemUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-gray-500">{tempoRestante(story.criadoEm)}</p>
            <button onClick={() => handleExcluir(story.id)} className="text-xs text-red-600 hover:text-red-800">
              Excluir
            </button>
          </div>
        ))}
        {stories.length === 0 && <p className="text-sm text-gray-500 col-span-3">Nenhum story ativo.</p>}
      </div>
    </main>
  );
}

export default function StoriesPage() {
  return (
    <ProtectedRoute>
      <StoriesContent />
    </ProtectedRoute>
  );
}
