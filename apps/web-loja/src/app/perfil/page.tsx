"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { atualizarLojaMe, uploadImagem } from "@/lib/api";

function PerfilContent() {
  const { auth, atualizarLoja } = useAuth();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(auth?.loja.imagemUrl ?? null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    setPreview(URL.createObjectURL(file));
    setMensagem(null);
  }

  async function handleSalvar() {
    if (!auth || !arquivo) return;
    setErro(null);
    setMensagem(null);
    setEnviando(true);
    try {
      const { url } = await uploadImagem(auth.token, arquivo);
      const loja = await atualizarLojaMe(auth.token, { imagemUrl: url });
      atualizarLoja(loja);
      setArquivo(null);
      setMensagem("Foto de capa atualizada.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover() {
    if (!auth) return;
    setErro(null);
    setMensagem(null);
    setEnviando(true);
    try {
      const loja = await atualizarLojaMe(auth.token, { imagemUrl: null });
      atualizarLoja(loja);
      setPreview(null);
      setArquivo(null);
      setMensagem("Foto de capa removida.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex-1 p-6 max-w-lg mx-auto w-full">
      <h1 className="text-xl font-bold text-red-600 mb-2">Foto de capa</h1>
      <p className="text-sm text-gray-500 mb-6">
        Aparece na página da sua loja e nas listas de restaurantes do app do cliente. Tamanho recomendado:
        480x600px (proporção 4:5) — a imagem é recortada automaticamente pra esse formato. Máx. 5MB.
      </p>

      <div className="w-48 h-60 rounded-lg border border-red-100 bg-gray-100 overflow-hidden mb-4 flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Prévia da capa" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-sm">Sem imagem</span>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleEscolherArquivo}
          className="block text-sm"
        />

        {mensagem && <p className="text-sm text-green-700">{mensagem}</p>}
        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSalvar}
            disabled={enviando || !arquivo}
            className="bg-red-600 text-white font-semibold px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar foto"}
          </button>
          {preview && (
            <button
              onClick={handleRemover}
              disabled={enviando}
              className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
            >
              Remover foto
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PerfilPage() {
  return (
    <ProtectedRoute>
      <PerfilContent />
    </ProtectedRoute>
  );
}
