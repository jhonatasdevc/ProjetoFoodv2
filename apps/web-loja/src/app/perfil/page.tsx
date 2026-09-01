"use client";

import { useState } from "react";
import type { Loja, TipoCashback, TipoFrete } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { atualizarLojaMe, uploadImagem } from "@/lib/api";

function requisitosFaltando(loja: {
  imagemUrl: string | null;
  imagemPerfilUrl: string | null;
  aceitaEntrega: boolean;
  tipoFrete: TipoFrete;
  valorFrete: number | null;
  aceitaRetirada: boolean;
}) {
  const faltando: string[] = [];
  if (!loja.imagemUrl) faltando.push("foto de capa");
  if (!loja.imagemPerfilUrl) faltando.push("foto de perfil");
  if (!loja.aceitaEntrega && !loja.aceitaRetirada) faltando.push("modo de entrega (entrega e/ou retirada)");
  if (loja.aceitaEntrega && loja.tipoFrete === "pago" && loja.valorFrete == null) faltando.push("valor do frete");
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
        <label
          className={`inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer transition-colors ${
            enviando ? "opacity-50 pointer-events-none" : "hover:bg-gray-200"
          }`}
        >
          📷 Escolher foto
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleEscolherArquivo}
            disabled={enviando}
            className="hidden"
          />
        </label>

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

function ArrobaEditor({ arrobaAtual }: { arrobaAtual: string }) {
  const { auth, atualizarLoja } = useAuth();
  const [arroba, setArroba] = useState(arrobaAtual);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || arroba === arrobaAtual) return;
    setErro(null);
    setMensagem(null);
    setSalvando(true);
    try {
      const nova = await atualizarLojaMe(auth.token, { arroba });
      atualizarLoja(nova);
      setMensagem("@ atualizado.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar @");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section>
      <h2 className="font-semibold text-gray-900 mb-1">Link da loja</h2>
      <p className="text-sm text-gray-500 mb-3">
        Esse é o endereço que o cliente acessa: pedidos.eazyclub.com.br/loja/<strong>{arroba || "..."}</strong>
      </p>
      <form onSubmit={handleSalvar} className="flex gap-2 items-start">
        <div className="flex items-center border border-gray-300 rounded px-3 focus-within:ring-1 focus-within:ring-red-400">
          <span className="text-gray-400">@</span>
          <input
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9_]+"
            title="Só letras minúsculas, números e underscore"
            value={arroba}
            onChange={(e) => setArroba(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            className="py-2 px-1 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={salvando || arroba === arrobaAtual}
          className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </form>
      {mensagem && <p className="text-sm text-green-700 mt-2">{mensagem}</p>}
      {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
    </section>
  );
}

function CashbackEditor({ loja }: { loja: Loja }) {
  const { auth, atualizarLoja } = useAuth();
  const [ativo, setAtivo] = useState(loja.cashbackAtivo);
  const [tipo, setTipo] = useState<TipoCashback>(loja.cashbackTipo ?? "percentual");
  const [valor, setValor] = useState(loja.cashbackValor != null ? String(loja.cashbackValor) : "");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setErro(null);
    setMensagem(null);
    setSalvando(true);
    try {
      const nova = await atualizarLojaMe(auth.token, {
        cashbackAtivo: ativo,
        cashbackTipo: tipo,
        cashbackValor: ativo ? (valor ? Number(valor) : null) : null,
      });
      atualizarLoja(nova);
      setMensagem("Cashback atualizado.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar cashback");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Cashback por indicação</h2>
      <p className="text-sm text-gray-500 mb-4">
        Quem compartilha o link da sua loja ganha esse cashback quando a pessoa indicada faz o primeiro pedido e ele
        é entregue. O cashback vira desconto usável em pedidos futuros nessa loja.
      </p>
      <form onSubmit={handleSalvar} className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-900 border border-gray-200 rounded-lg p-3">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="accent-red-600" />
          Ativar cashback por indicação
        </label>

        {ativo && (
          <div className="pl-1 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="tipoCashback"
                checked={tipo === "percentual"}
                onChange={() => setTipo("percentual")}
                className="accent-red-600"
              />
              % do valor do pedido indicado
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="tipoCashback"
                checked={tipo === "valor_fixo"}
                onChange={() => setTipo("valor_fixo")}
                className="accent-red-600"
              />
              Valor fixo (R$)
            </label>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                {tipo === "percentual" ? "Percentual (%)" : "Valor (R$)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                max={tipo === "percentual" ? 100 : undefined}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
        )}

        {mensagem && <p className="text-sm text-green-700">{mensagem}</p>}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={salvando}
          className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar cashback"}
        </button>
      </form>
    </section>
  );
}

function PerfilContent() {
  const { auth, atualizarLoja } = useAuth();
  const loja = auth!.loja;

  const [aceitaEntrega, setAceitaEntrega] = useState(loja.aceitaEntrega);
  const [tipoFrete, setTipoFrete] = useState<TipoFrete>(loja.tipoFrete);
  const [valorFrete, setValorFrete] = useState(loja.valorFrete != null ? String(loja.valorFrete) : "");
  const [aceitaRetirada, setAceitaRetirada] = useState(loja.aceitaRetirada);
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
        aceitaEntrega,
        tipoFrete,
        valorFrete: aceitaEntrega && tipoFrete === "pago" ? (valorFrete ? Number(valorFrete) : null) : null,
        aceitaRetirada,
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

      <ArrobaEditor arrobaAtual={loja.arroba} />

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
          Você pode aceitar entrega, retirada no local, ou as duas ao mesmo tempo — o cliente escolhe qual quer usar
          na hora de fechar o pedido.
        </p>
        <form onSubmit={handleSalvarFrete} className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <input
                type="checkbox"
                checked={aceitaEntrega}
                onChange={(e) => setAceitaEntrega(e.target.checked)}
                className="accent-red-600"
              />
              Aceita entrega
            </label>
            {aceitaEntrega && (
              <div className="pl-6 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="tipoFrete"
                    checked={tipoFrete === "gratis"}
                    onChange={() => setTipoFrete("gratis")}
                    className="accent-red-600"
                  />
                  Frete grátis
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="tipoFrete"
                    checked={tipoFrete === "pago"}
                    onChange={() => setTipoFrete("pago")}
                    className="accent-red-600"
                  />
                  Frete pago
                </label>
                {tipoFrete === "pago" && (
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
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-900 border border-gray-200 rounded-lg p-3">
            <input
              type="checkbox"
              checked={aceitaRetirada}
              onChange={(e) => setAceitaRetirada(e.target.checked)}
              className="accent-red-600"
            />
            Aceita retirada no local (clique e retire)
          </label>

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

      <CashbackEditor loja={loja} />
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
