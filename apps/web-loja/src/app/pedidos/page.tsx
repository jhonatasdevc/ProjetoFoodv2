"use client";

import { useEffect, useMemo, useState } from "react";
import {
  labelStatusPedido,
  PEDIDO_STATUS_LABEL,
  STATUS_PEDIDO_EM_ANDAMENTO,
  type MensagemPedido,
  type Pedido,
  type PedidoStatus,
} from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { avancarStatusPedido, listPedidos } from "@/lib/api";
import { conectarSocketLoja, tocarBeep } from "@/lib/socket";
import { ChatPedido } from "./chat-pedido";

const ABAS: PedidoStatus[] = ["recebido", "preparando", "saiu_entrega", "entregue", "cancelado"];

const PROXIMO_STATUS: Partial<Record<PedidoStatus, PedidoStatus>> = {
  recebido: "preparando",
  preparando: "saiu_entrega",
  saiu_entrega: "entregue",
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PedidosContent() {
  const { auth } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [aba, setAba] = useState<PedidoStatus>("recebido");
  const [carregando, setCarregando] = useState(true);
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [chatAberto, setChatAberto] = useState<number | null>(null);
  const [naoLidos, setNaoLidos] = useState<Set<number>>(new Set());

  function carregarPedidos() {
    if (!auth) return;
    setCarregando(true);
    listPedidos(auth.token, { de: dataDe || undefined, ate: dataAte || undefined })
      .then(setPedidos)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, dataDe, dataAte]);

  useEffect(() => {
    if (!auth) return;
    const socket = conectarSocketLoja(auth.loja.id);
    socket.on("pedido:criado", (pedido: Pedido) => {
      setPedidos((prev) => [pedido, ...prev]);
      tocarBeep();
    });
    socket.on("pedido:atualizado", (pedido: Pedido) => {
      setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? pedido : p)));
    });
    socket.on("mensagem:nova", (mensagem: MensagemPedido) => {
      setNaoLidos((prev) => new Set(prev).add(mensagem.idPedido));
      tocarBeep();
    });
    return () => {
      socket.disconnect();
    };
  }, [auth]);

  function abrirChat(idPedido: number) {
    setChatAberto(idPedido);
    setNaoLidos((prev) => {
      if (!prev.has(idPedido)) return prev;
      const proximo = new Set(prev);
      proximo.delete(idPedido);
      return proximo;
    });
  }

  const pedidosDaAba = useMemo(() => pedidos.filter((p) => p.status === aba), [pedidos, aba]);

  async function handleAvancar(pedido: Pedido) {
    const proximo = PROXIMO_STATUS[pedido.status];
    if (!proximo || !auth) return;
    const atualizado = await avancarStatusPedido(auth.token, pedido.id, proximo);
    setPedidos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
  }

  async function handleCancelar(pedido: Pedido) {
    if (!auth) return;
    const atualizado = await avancarStatusPedido(auth.token, pedido.id, "cancelado");
    setPedidos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
  }

  return (
    <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input
            type="date"
            value={dataDe}
            onChange={(e) => setDataDe(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input
            type="date"
            value={dataAte}
            onChange={(e) => setDataAte(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        {(dataDe || dataAte) && (
          <button
            onClick={() => {
              setDataDe("");
              setDataAte("");
            }}
            className="text-sm text-gray-500 hover:text-red-600 pb-1.5"
          >
            Limpar filtro
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4">
        {ABAS.map((status) => (
          <button
            key={status}
            onClick={() => setAba(status)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${
              aba === status ? "bg-red-600 text-white border-red-600" : "border-gray-300 text-gray-600"
            }`}
          >
            {PEDIDO_STATUS_LABEL[status]} ({pedidos.filter((p) => p.status === status).length})
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-gray-500">Carregando pedidos...</p>
      ) : pedidosDaAba.length === 0 ? (
        <p className="text-gray-500">Nenhum pedido nesse status.</p>
      ) : (
        <div className="space-y-3">
          {pedidosDaAba.map((pedido) => (
            <div key={pedido.id} className="border border-red-100 rounded-lg p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    #{pedido.id} · {pedido.clienteNome}
                  </p>
                  <p className="text-sm text-gray-500">{pedido.clienteTelefone}</p>
                  <p className="text-sm text-gray-500">{pedido.enderecoTexto}</p>
                </div>
                <p className="font-semibold text-red-600">{formatBRL(pedido.total)}</p>
              </div>

              <ul className="mt-3 text-sm text-gray-700 space-y-0.5">
                {pedido.itens.map((item) => (
                  <li key={item.id}>
                    {item.quantidade}x {item.nome}
                    {item.complementos.length > 0 && (
                      <span className="text-gray-500"> ({item.complementos.map((c) => c.nome).join(", ")})</span>
                    )}
                    {item.observacao && <span className="text-amber-700"> — obs: {item.observacao}</span>}
                  </li>
                ))}
              </ul>

              {pedido.observacoes && <p className="mt-2 text-sm text-gray-500 italic">Obs: {pedido.observacoes}</p>}

              <p className="mt-2 text-xs text-gray-400">Pagamento: {pedido.formaPagamento}</p>

              <div className="mt-3 flex gap-2 items-center flex-wrap">
                {PROXIMO_STATUS[pedido.status] && (
                  <button
                    onClick={() => handleAvancar(pedido)}
                    className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700"
                  >
                    Avançar para {labelStatusPedido(PROXIMO_STATUS[pedido.status]!, pedido.tipoEntrega)}
                  </button>
                )}
                {STATUS_PEDIDO_EM_ANDAMENTO.includes(pedido.status) && (
                  <button
                    onClick={() => abrirChat(pedido.id)}
                    className={`relative text-sm font-medium rounded-full px-3 py-1.5 border ${
                      naoLidos.has(pedido.id)
                        ? "text-green-700 border-green-600 bg-green-50 animate-pulse"
                        : "text-green-700 border-green-600 hover:bg-green-50"
                    }`}
                  >
                    💬 Chat
                    {naoLidos.has(pedido.id) && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                      </span>
                    )}
                  </button>
                )}
                {PROXIMO_STATUS[pedido.status] && (
                  <button
                    onClick={() => handleCancelar(pedido)}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {chatAberto !== null && auth && (
        <ChatPedido token={auth.token} idPedido={chatAberto} onFechar={() => setChatAberto(null)} />
      )}
    </main>
  );
}

export default function PedidosPage() {
  return (
    <ProtectedRoute>
      <PedidosContent />
    </ProtectedRoute>
  );
}
