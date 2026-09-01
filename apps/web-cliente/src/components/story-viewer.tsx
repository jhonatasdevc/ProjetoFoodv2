"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoriesLoja } from "@delivery/shared";
import { marcarVisto } from "@/lib/stories-vistos";
import { useFavoritoLoja } from "@/lib/use-favorito";

const DURACAO_MS = 15000;

export function StoryViewer({ grupo, onFechar }: { grupo: StoriesLoja; onFechar: () => void }) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const story = grupo.stories[indice];
  const { favoritado, alternar, carregando, logado } = useFavoritoLoja(grupo.idLoja);

  useEffect(() => {
    if (!story) return;
    marcarVisto(story.id);
    setProgresso(0);
    const raf = requestAnimationFrame(() => setProgresso(100));
    const timer = setTimeout(avancar, DURACAO_MS);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  if (!story) return null;

  function avancar() {
    if (indice + 1 >= grupo.stories.length) {
      onFechar();
    } else {
      setIndice((i) => i + 1);
    }
  }

  function handleVerLoja(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/loja/${grupo.lojaArroba}`);
  }

  function handleFavoritar(e: React.MouseEvent) {
    e.stopPropagation();
    if (!logado) {
      router.push(`/login?redirect=/loja/${grupo.lojaArroba}`);
      return;
    }
    alternar();
  }

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col" onClick={avancar}>
      <div className="flex gap-1 p-3 pt-4">
        {grupo.stories.map((s, i) => (
          <div key={s.id} className="h-1 flex-1 rounded bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white"
              style={{
                width: i < indice ? "100%" : i === indice ? `${progresso}%` : "0%",
                transition: i === indice ? `width ${DURACAO_MS}ms linear` : "none",
              }}
            />
          </div>
        ))}
      </div>

      <p className="px-3 text-white font-semibold text-sm">{grupo.lojaNome}</p>

      <div className="flex-1 flex items-center justify-center min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story.imagemUrl} alt={grupo.lojaNome} className="max-h-full max-w-full object-contain" />
      </div>

      <div className="p-4 flex gap-2">
        <button onClick={handleVerLoja} className="flex-[3] bg-white text-gray-900 font-semibold py-2 rounded-full">
          Ver Loja
        </button>
        <button
          onClick={handleFavoritar}
          disabled={carregando}
          aria-label={favoritado ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className={`flex-1 font-semibold py-2 rounded-full border-2 disabled:opacity-50 ${
            favoritado ? "bg-red-600 border-red-600 text-white" : "bg-transparent border-white text-white"
          }`}
        >
          {favoritado ? "♥" : "♡"}
        </button>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onFechar();
        }}
        aria-label="Fechar"
        className="absolute top-4 right-3 text-white text-2xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
