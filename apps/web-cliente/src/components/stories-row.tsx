"use client";

import { useEffect, useState } from "react";
import type { StoriesLoja } from "@delivery/shared";
import { getStories } from "@/lib/api";
import { estaVisto } from "@/lib/stories-vistos";
import { StoryViewer } from "./story-viewer";

export function StoriesRow() {
  const [grupos, setGrupos] = useState<StoriesLoja[] | null>(null);
  const [abertoIdx, setAbertoIdx] = useState<number | null>(null);

  useEffect(() => {
    getStories().then(setGrupos);
  }, []);

  if (!grupos || grupos.length === 0) return null;

  return (
    <section className="mb-8 -mx-4">
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
        {grupos.map((g, i) => {
          const vistoCompleto = g.stories.every((s) => estaVisto(s.id));
          return (
            <button key={g.idLoja} onClick={() => setAbertoIdx(i)} className="shrink-0 w-20 snap-start text-left">
              <div
                className={`w-20 h-28 rounded-md overflow-hidden border-2 bg-gray-100 ${
                  vistoCompleto ? "border-gray-300" : "border-red-500"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.stories[0].imagemUrl} alt={g.lojaNome} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-gray-700 text-center mt-1 truncate w-20">{g.lojaNome}</p>
            </button>
          );
        })}
      </div>

      {abertoIdx !== null && <StoryViewer grupo={grupos[abertoIdx]} onFechar={() => setAbertoIdx(null)} />}
    </section>
  );
}
