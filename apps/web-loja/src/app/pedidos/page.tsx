"use client";

import { useEffect, useMemo, useState } from "react";
import { labelStatusPedido, PEDIDO_STATUS_LABEL, type Pedido, type PedidoStatus } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { avancarStatusPedido, listPedidos } from "@/lib/api";
import { conectarSocketLoja, tocarBeep } from "@/lib/socket";

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

  useEffect(() => {
    if (!auth) return;
    listPedidos(auth.token)
      .then(setPedidos)
      .finally(() => setCarregando(false));

    const socket = conectarSocketLoja(auth.loja.id);
    socket.on("pedido:criado", (pedido: Pedido) => {
      setPedidos((prev) => [pedido, ...prev]);
      tocarBeep();
    });
    socket.on("pedido:atualizado", (pedido: Pedido) => {
      setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? pedido : p)));
    });
    return () => {
      socket.disconnect();
    };
  }, [auth]);

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

              {PROXIMO_STATUS[pedido.status] && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAvancar(pedido)}
                    className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700"
                  >
                    Avançar para {labelStatusPedido(PROXIMO_STATUS[pedido.status]!, pedido.tipoEntrega)}
                  </button>
                  <button
                    onClick={() => handleCancelar(pedido)}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
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
