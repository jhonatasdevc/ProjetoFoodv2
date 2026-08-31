"use client";

import { useEffect, useState } from "react";
import type { Categoria } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { editarCategoria, editarItem, getCardapio } from "@/lib/api";

const WEB_CLIENTE_URL = process.env.NEXT_PUBLIC_WEB_CLIENTE_URL ?? "http://localhost:3002";

function moverArray<T>(itens: T[], indice: number, direcao: -1 | 1): T[] {
  const novoIndice = indice + direcao;
  if (novoIndice < 0 || novoIndice >= itens.length) return itens;
  const copia = [...itens];
  [copia[indice], copia[novoIndice]] = [copia[novoIndice], copia[indice]];
  return copia;
}

function VitrineContent() {
  const { auth } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  function recarregar() {
    if (!auth) return;
    getCardapio(auth.loja.id, auth.token).then((r) => setCategorias(r.categorias));
  }

  useEffect(recarregar, [auth]);

  function atualizarPreview() {
    setPreviewKey((k) => k + 1);
  }

  async function salvarOrdemCategorias(novasCategorias: Categoria[]) {
    if (!auth) return;
    setCategorias(novasCategorias);
    setSalvando(true);
    setErro(null);
    try {
      await Promise.all(novasCategorias.map((c, i) => editarCategoria(auth.token, c.id, { ordem: i })));
      atualizarPreview();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar ordem");
      recarregar();
    } finally {
      setSalvando(false);
    }
  }

  function handleMoverCategoria(indice: number, direcao: -1 | 1) {
    if (!categorias) return;
    salvarOrdemCategorias(moverArray(categorias, indice, direcao));
  }

  async function salvarOrdemItens(idCategoria: number, novosItens: Categoria["itens"]) {
    if (!auth || !categorias) return;
    const novasCategorias = categorias.map((c) => (c.id === idCategoria ? { ...c, itens: novosItens } : c));
    setCategorias(novasCategorias);
    setSalvando(true);
    setErro(null);
    try {
      await Promise.all(novosItens.map((item, i) => editarItem(auth.token, item.id, { ordem: i })));
      atualizarPreview();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar ordem");
      recarregar();
    } finally {
      setSalvando(false);
    }
  }

  function handleMoverItem(categoria: Categoria, indice: number, direcao: -1 | 1) {
    salvarOrdemItens(categoria.id, moverArray(categoria.itens, indice, direcao));
  }

  if (!auth || !categorias) return <main className="flex-1 p-6 text-gray-500 text-sm">Carregando...</main>;

  return (
    <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
      <h1 className="text-xl font-bold text-red-600 mb-1">Vitrine</h1>
      <p className="text-sm text-gray-500 mb-6">
        Veja como sua loja aparece pro cliente e organize a ordem das categorias e dos itens do cardápio.
      </p>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="shrink-0 mx-auto md:mx-0">
          <div className="flex items-center justify-between mb-2 w-[375px]">
            <span className="text-sm font-medium text-gray-700">Pré-visualização</span>
            <button onClick={atualizarPreview} className="text-xs text-red-600 hover:text-red-800">
              ↻ Atualizar
            </button>
          </div>
          <div className="w-[375px] h-[720px] rounded-[2rem] border-8 border-gray-900 overflow-hidden bg-white shadow-lg">
            <iframe
              key={previewKey}
              src={`${WEB_CLIENTE_URL}/loja/${auth.loja.id}`}
              className="w-full h-full border-0"
              title="Pré-visualização da loja"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}
          {salvando && <p className="text-sm text-gray-400 mb-3">Salvando ordem...</p>}

          <div className="space-y-4">
            {categorias.map((categoria, indiceCategoria) => (
              <section key={categoria.id} className="border border-red-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-green-700">{categoria.nome}</h2>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoverCategoria(indiceCategoria, -1)}
                      disabled={indiceCategoria === 0 || salvando}
                      className="w-6 h-6 rounded border border-gray-300 text-gray-600 text-xs disabled:opacity-30"
                      title="Mover categoria pra cima"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoverCategoria(indiceCategoria, 1)}
                      disabled={indiceCategoria === categorias.length - 1 || salvando}
                      className="w-6 h-6 rounded border border-gray-300 text-gray-600 text-xs disabled:opacity-30"
                      title="Mover categoria pra baixo"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                <ul className="space-y-1">
                  {categoria.itens.map((item, indiceItem) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-sm py-1">
                      <span className={item.disponivel ? "text-gray-900" : "text-gray-400"}>
                        {item.destaque && "⭐ "}
                        {item.nome}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleMoverItem(categoria, indiceItem, -1)}
                          disabled={indiceItem === 0 || salvando}
                          className="w-6 h-6 rounded border border-gray-300 text-gray-600 text-xs disabled:opacity-30"
                          title="Mover item pra cima"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoverItem(categoria, indiceItem, 1)}
                          disabled={indiceItem === categoria.itens.length - 1 || salvando}
                          className="w-6 h-6 rounded border border-gray-300 text-gray-600 text-xs disabled:opacity-30"
                          title="Mover item pra baixo"
                        >
                          ▼
                        </button>
                      </div>
                    </li>
                  ))}
                  {categoria.itens.length === 0 && <p className="text-xs text-gray-400">Sem itens nessa categoria.</p>}
                </ul>
              </section>
            ))}
            {categorias.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhuma categoria cadastrada ainda — crie categorias e itens no Cardápio primeiro.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VitrinePage() {
  return (
    <ProtectedRoute>
      <VitrineContent />
    </ProtectedRoute>
  );
}
