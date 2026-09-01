"use client";

import { useEffect, useRef, useState } from "react";
import type { MensagemPedido } from "@delivery/shared";
import { enviarMensagem, listMensagens } from "@/lib/api";

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatPedido({ token, idPedido, onFechar }: { token: string; idPedido: number; onFechar: () => void }) {
  const [mensagens, setMensagens] = useState<MensagemPedido[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  function carregar() {
    listMensagens(token, idPedido).then(setMensagens);
  }

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 3000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPedido]);

  // Avisa o service worker que esse pedido está com o chat aberto na tela, pra ele não
  // disparar push notification de mensagem nova enquanto o cliente já está vendo.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.controller?.postMessage({ type: "chat-aberto", idPedido });
    return () => {
      navigator.serviceWorker.controller?.postMessage({ type: "chat-fechado", idPedido });
    };
  }, [idPedido]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  async function handleEnviar() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      setTexto("");
      const nova = await enviarMensagem(token, idPedido, conteudo);
      setMensagens((prev) => [...prev, nova]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setEnviando(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnviar();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm h-[80vh] sm:h-[600px] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900">Chat com a loja</h2>
          <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
          {mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.remetente === "cliente" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm text-white ${
                  m.remetente === "cliente" ? "bg-green-600 rounded-br-sm" : "bg-gray-500 rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                <p className="text-[10px] text-white/70 text-right mt-0.5">{formatHora(m.criadoEm)}</p>
              </div>
            </div>
          ))}
          {mensagens.length === 0 && <p className="text-sm text-gray-400 text-center mt-4">Nenhuma mensagem ainda.</p>}
          <div ref={fimRef} />
        </div>

        <div className="p-3 border-t border-gray-100 shrink-0">
          {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
          <div className="flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm"
            />
            <button
              onClick={handleEnviar}
              disabled={enviando || !texto.trim()}
              className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 shrink-0"
              aria-label="Enviar"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
