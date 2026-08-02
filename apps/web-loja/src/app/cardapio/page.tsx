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

      {categorias.map((categoria) => (
        <section key={categoria.id} className="mb-6 border border-red-100 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-green-700">{categoria.nome}</h2>
            <button onClick={() => handleExcluirCategoria(categoria.id)} className="text-xs text-gray-400 hover:text-red-600">
              excluir categoria
            </button>
          </div>

          <ul className="space-y-2">
            {categoria.itens.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={item.disponivel}
                    onChange={(e) => handleToggleDisponivel(item.id, e.target.checked)}
                    className="accent-green-600"
                  />
                </label>
                <span className={`flex-1 ${item.disponivel ? "text-gray-900" : "text-gray-400 line-through"}`}>{item.nome}</span>
                <span className="text-gray-600">{formatBRL(item.preco)}</span>
                <button onClick={() => handleExcluirItem(item.id)} className="text-gray-400 hover:text-red-600">
                  ×
                </button>
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
