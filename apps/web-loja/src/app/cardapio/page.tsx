"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import {
  criarCategoria,
  criarItem,
  editarItem,
  excluirCategoria,
  excluirItem,
  getCardapio,
  uploadImagem,
} from "@/lib/api";
import type { Categoria } from "@delivery/shared";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function NovoItemForm({ idCategoria, token, onCriado }: { idCategoria: number; token: string; onCriado: () => void }) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const precoNum = Number(preco.replace(",", "."));
    if (!nome || !precoNum) return;
    setEnviando(true);
    try {
      await criarItem(token, { idCategoria, nome, preco: precoNum });
      setNome("");
      setPreco("");
      onCriado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do item"
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <input
        value={preco}
        onChange={(e) => setPreco(e.target.value)}
        placeholder="Preço"
        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={enviando}
        className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
      >
        Adicionar
      </button>
    </form>
  );
}

function OfertaInline({ idItem, precoPromocional, token, onSalvo }: { idItem: number; precoPromocional: number | null; token: string; onSalvo: () => void }) {
  const [valor, setValor] = useState(precoPromocional != null ? String(precoPromocional) : "");
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    try {
      const num = valor ? Number(valor.replace(",", ".")) : null;
      await editarItem(token, idItem, { precoPromocional: num });
      onSalvo();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-1 ml-6">
      <span className="text-xs text-gray-500">Preço promocional:</span>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="ex: 29,90"
        className="w-24 border border-gray-300 rounded px-2 py-0.5 text-xs"
      />
      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="text-xs text-green-700 hover:text-green-900 disabled:opacity-50"
      >
        Salvar
      </button>
    </div>
  );
}

function ImagemInline({ idItem, imagemUrl, token, onSalvo }: { idItem: number; imagemUrl: string | null; token: string; onSalvo: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro(null);
    setEnviando(true);
    try {
      const { url } = await uploadImagem(token, file);
      await editarItem(token, idItem, { imagemUrl: url });
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover() {
    setEnviando(true);
    try {
      await editarItem(token, idItem, { imagemUrl: null });
      onSalvo();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-1 ml-6">
      <span className="text-xs text-gray-500">Foto do produto:</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleEscolherArquivo}
        disabled={enviando}
        className="text-xs"
      />
      {imagemUrl && (
        <button onClick={handleRemover} disabled={enviando} className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50">
          remover
        </button>
      )}
      {enviando && <span className="text-xs text-gray-400">enviando...</span>}
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
}

function CardapioContent() {
  const { auth } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novaCategoria, setNovaCategoria] = useState("");

  async function recarregar() {
    if (!auth) return;
    const cardapio = await getCardapio(auth.loja.id, auth.token);
    setCategorias(cardapio.categorias);
  }

  useEffect(() => {
    recarregar().finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  async function handleNovaCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !novaCategoria) return;
    await criarCategoria(auth.token, novaCategoria, categorias.length);
    setNovaCategoria("");
    recarregar();
  }

  async function handleExcluirCategoria(id: number) {
    if (!auth) return;
    await excluirCategoria(auth.token, id);
    recarregar();
  }

  async function handleToggleDisponivel(idItem: number, disponivel: boolean) {
    if (!auth) return;
    await editarItem(auth.token, idItem, { disponivel });
    recarregar();
  }

  const totalDestaques = categorias.reduce((s, c) => s + c.itens.filter((i) => i.destaque).length, 0);

  async function handleToggleDestaque(idItem: number, destaque: boolean) {
    if (!auth) return;
    if (destaque && totalDestaques >= 3) return;
    try {
      await editarItem(auth.token, idItem, { destaque });
      recarregar();
    } catch {
      // Corrida rara (dois toggles quase simultâneos batendo no limite) — só recarrega
      // pra refletir o que realmente ficou salvo.
      recarregar();
    }
  }

  async function handleExcluirItem(idItem: number) {
    if (!auth) return;
    await excluirItem(auth.token, idItem);
    recarregar();
  }

  if (carregando) return <p className="p-4 text-gray-500">Carregando cardápio...</p>;

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <form onSubmit={handleNovaCategoria} className="flex gap-2 mb-6">
        <input
          value={novaCategoria}
          onChange={(e) => setNovaCategoria(e.target.value)}
          placeholder="Nova categoria (ex: Pizzas)"
          className="flex-1 border border-gray-300 rounded px-3 py-2"
        />
        <button type="submit" className="bg-red-600 text-white font-medium px-4 py-2 rounded hover:bg-red-700">
          Criar categoria
        </button>
      </form>

      <p className="text-sm text-gray-500 mb-4">
        Itens em destaque (aparecem numa seção especial pro cliente):{" "}
        <span className={totalDestaques >= 3 ? "text-amber-700 font-medium" : "text-gray-700 font-medium"}>
          {totalDestaques}/3
        </span>
      </p>

      {categorias.map((categoria) => (
        <section key={categoria.id} className="mb-6 border border-red-100 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-green-700">{categoria.nome}</h2>
            <button onClick={() => handleExcluirCategoria(categoria.id)} className="text-xs text-gray-400 hover:text-red-600">
              excluir categoria
            </button>
          </div>

          <ul className="space-y-3">
            {categoria.itens.map((item) => (
              <li key={item.id} className="text-sm">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={item.disponivel}
                      onChange={(e) => handleToggleDisponivel(item.id, e.target.checked)}
                      className="accent-green-600"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleToggleDestaque(item.id, !item.destaque)}
                    disabled={!item.destaque && totalDestaques >= 3}
                    title={item.destaque ? "Remover destaque" : "Marcar como destaque"}
                    className={`text-lg leading-none disabled:opacity-30 disabled:cursor-not-allowed ${
                      item.destaque ? "text-amber-500" : "text-gray-300 hover:text-amber-400"
                    }`}
                  >
                    ★
                  </button>
                  {item.imagemUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagemUrl} alt={item.nome} className="w-8 h-8 rounded object-cover" />
                  )}
                  <span className={`flex-1 ${item.disponivel ? "text-gray-900" : "text-gray-400 line-through"}`}>{item.nome}</span>
                  {item.precoPromocional != null ? (
                    <span className="text-gray-600">
                      <span className="line-through text-gray-400 mr-1">{formatBRL(item.preco)}</span>
                      <span className="text-red-600 font-medium">{formatBRL(item.precoPromocional)}</span>
                    </span>
                  ) : (
                    <span className="text-gray-600">{formatBRL(item.preco)}</span>
                  )}
                  <button onClick={() => handleExcluirItem(item.id)} className="text-gray-400 hover:text-red-600">
                    ×
                  </button>
                </div>
                <OfertaInline
                  idItem={item.id}
                  precoPromocional={item.precoPromocional}
                  token={auth!.token}
                  onSalvo={recarregar}
                />
                <ImagemInline idItem={item.id} imagemUrl={item.imagemUrl} token={auth!.token} onSalvo={recarregar} />
              </li>
            ))}
          </ul>

          <NovoItemForm idCategoria={categoria.id} token={auth!.token} onCriado={() => recarregar()} />
        </section>
      ))}
    </main>
  );
}

export default function CardapioPage() {
  return (
    <ProtectedRoute>
      <CardapioContent />
    </ProtectedRoute>
  );
}
