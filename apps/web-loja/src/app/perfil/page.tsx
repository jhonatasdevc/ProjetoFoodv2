"use client";

import { useState } from "react";
import type { TipoEntrega } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { atualizarLojaMe, uploadImagem } from "@/lib/api";

function requisitosFaltando(loja: { imagemUrl: string | null; imagemPerfilUrl: string | null; tipoEntrega: TipoEntrega; valorFrete: number | null }) {
  const faltando: string[] = [];
  if (!loja.imagemUrl) faltando.push("foto de capa");
  if (!loja.imagemPerfilUrl) faltando.push("foto de perfil");
  if (loja.tipoEntrega === "pago" && loja.valorFrete == null) faltando.push("valor do frete");
  return faltando;
}

function FotoUploader({
  titulo,
  descricao,
  formato,
  urlAtual,
  onSalvar,
}: {
  titulo: string;
  descricao: string;
  formato: "capa" | "perfil";
  urlAtual: string | null;
  onSalvar: (url: string | null) => Promise<void>;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(urlAtual);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { auth } = useAuth();

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
      await onSalvar(url);
      setArquivo(null);
      setMensagem("Foto atualizada.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover() {
    setErro(null);
    setMensagem(null);
    setEnviando(true);
    try {
      await onSalvar(null);
      setPreview(null);
      setArquivo(null);
      setMensagem("Foto removida.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{titulo}</h2>
      <p className="text-sm text-gray-500 mb-4">{descricao}</p>

      <div
        className={`overflow-hidden border border-red-100 bg-gray-100 mb-4 flex items-center justify-center ${
          formato === "perfil" ? "w-28 h-28 rounded-full" : "w-48 h-60 rounded-lg"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={titulo} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-xs text-center px-2">Sem imagem</span>
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
    </section>
  );
}

function PerfilContent() {
  const { auth, atualizarLoja } = useAuth();
  const loja = auth!.loja;

  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>(loja.tipoEntrega);
  const [valorFrete, setValorFrete] = useState(loja.valorFrete != null ? String(loja.valorFrete) : "");
  const [salvandoFrete, setSalvandoFrete] = useState(false);
  const [mensagemFrete, setMensagemFrete] = useState<string | null>(null);
  const [erroFrete, setErroFrete] = useState<string | null>(null);

  const [desbloqueando, setDesbloqueando] = useState(false);
  const [erroDesbloqueio, setErroDesbloqueio] = useState<string | null>(null);

  const faltando = requisitosFaltando(loja);

  async function handleSalvarFrete(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setErroFrete(null);
    setMensagemFrete(null);
    setSalvandoFrete(true);
    try {
      const nova = await atualizarLojaMe(auth.token, {
        tipoEntrega,
        valorFrete: tipoEntrega === "pago" ? (valorFrete ? Number(valorFrete) : null) : null,
      });
      atualizarLoja(nova);
      setMensagemFrete("Frete atualizado.");
    } catch (err) {
      setErroFrete(err instanceof Error ? err.message : "Erro ao salvar frete");
    } finally {
      setSalvandoFrete(false);
    }
  }

  async function handleDesbloquear() {
    if (!auth) return;
    setErroDesbloqueio(null);
    setDesbloqueando(true);
    try {
      const nova = await atualizarLojaMe(auth.token, { ativo: true });
      atualizarLoja(nova);
    } catch (err) {
      setErroDesbloqueio(err instanceof Error ? err.message : "Erro ao desbloquear loja");
    } finally {
      setDesbloqueando(false);
    }
  }

  return (
    <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-8">
      <h1 className="text-xl font-bold text-red-600 mb-2">Perfil da loja</h1>

      {loja.ativo ? (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-sm text-green-800">
          Loja desbloqueada — visível pros clientes.
        </div>
      ) : (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
          <p className="text-sm text-amber-800 font-medium">
            Sua loja está bloqueada e não aparece pro cliente até você completar o cadastro.
          </p>
          {faltando.length > 0 && (
            <p className="text-sm text-amber-700">Faltando: {faltando.join(", ")}.</p>
          )}
          {erroDesbloqueio && <p className="text-sm text-red-600">{erroDesbloqueio}</p>}
          <button
            onClick={handleDesbloquear}
            disabled={desbloqueando || faltando.length > 0}
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {desbloqueando ? "Desbloqueando..." : "Desbloquear loja"}
          </button>
        </div>
      )}

      <FotoUploader
        titulo="Foto de capa"
        descricao="Aparece na página da sua loja e nas listas de restaurantes do app do cliente. Tamanho recomendado: 480x600px (proporção 4:5). Máx. 5MB."
        formato="capa"
        urlAtual={loja.imagemUrl}
        onSalvar={async (url) => {
          const nova = await atualizarLojaMe(auth!.token, { imagemUrl: url });
          atualizarLoja(nova);
        }}
      />

      <FotoUploader
        titulo="Foto de perfil"
        descricao="Aparece em formato redondo, junto do nome da loja, em listas como 'Últimos Pedidos'. Máx. 5MB."
        formato="perfil"
        urlAtual={loja.imagemPerfilUrl}
        onSalvar={async (url) => {
          const nova = await atualizarLojaMe(auth!.token, { imagemPerfilUrl: url });
          atualizarLoja(nova);
        }}
      />

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Entrega</h2>
        <p className="text-sm text-gray-500 mb-4">
          Escolha como o cliente recebe o pedido: frete grátis, frete com valor fixo, ou clique e retire (cliente
          busca no endereço da loja, sem cobrar entrega).
        </p>
        <form onSubmit={handleSalvarFrete} className="space-y-3">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="tipoEntrega"
                checked={tipoEntrega === "gratis"}
                onChange={() => setTipoEntrega("gratis")}
                className="accent-red-600"
              />
              Frete grátis
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="tipoEntrega"
                checked={tipoEntrega === "pago"}
                onChange={() => setTipoEntrega("pago")}
                className="accent-red-600"
              />
              Frete pago
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="tipoEntrega"
                checked={tipoEntrega === "retirada"}
                onChange={() => setTipoEntrega("retirada")}
                className="accent-red-600"
              />
              Clique e retire (sem entrega)
            </label>
          </div>
          {tipoEntrega === "pago" && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">Valor do frete (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorFrete}
                onChange={(e) => setValorFrete(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          )}
          {mensagemFrete && <p className="text-sm text-green-700">{mensagemFrete}</p>}
          {erroFrete && <p className="text-sm text-red-600">{erroFrete}</p>}
          <button
            type="submit"
            disabled={salvandoFrete}
            className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {salvandoFrete ? "Salvando..." : "Salvar entrega"}
          </button>
        </form>
      </section>
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
