"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { labelStatusPedido, STATUS_PEDIDO_EM_ANDAMENTO, type Pedido } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { getMeusPedidos } from "@/lib/api";
import { useMinutosDecorridos } from "@/lib/use-minutos-decorridos";
import { ChatPedido } from "@/components/chat-pedido";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ContadorMinutos({ criadoEm }: { criadoEm: string }) {
  const minutos = useMinutosDecorridos(criadoEm);
  return <span className="text-xs text-gray-400">⏱ {minutos} min</span>;
}

function PedidosContent() {
  const { auth } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [chatAberto, setChatAberto] = useState<number | null>(null);

  useEffect(() => {
    if (!auth) return;
    getMeusPedidos(auth.token).then(setPedidos);
  }, [auth]);

  if (!pedidos) return <p className="p-6 text-center text-gray-500">Carregando...</p>;

  const ativos = pedidos.filter((p) => p.status !== "entregue" && p.status !== "cancelado");

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-4">
      <h1 className="text-xl font-bold text-red-600 mb-4">Pedidos em andamento</h1>

      <div className="space-y-2">
        {ativos.map((pedido) => (
          <div key={pedido.id} className="border border-red-100 rounded-lg overflow-hidden">
            <Link href={`/pedido/${pedido.id}`} className="block p-4 hover:bg-red-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{pedido.lojaNome}</p>
                  <p className="text-sm text-green-700">{labelStatusPedido(pedido.status, pedido.tipoEntrega)}</p>
                  <ContadorMinutos criadoEm={pedido.criadoEm} />
                </div>
                <p className="text-gray-600 text-sm">{formatBRL(pedido.total)}</p>
              </div>
            </Link>
            {STATUS_PEDIDO_EM_ANDAMENTO.includes(pedido.status) && (
              <div className="px-4 pb-3 -mt-1">
                <button
                  onClick={() => setChatAberto(pedido.id)}
                  className="text-sm text-red-600 font-medium border border-red-200 rounded-full px-3 py-1.5 hover:bg-red-50"
                >
                  💬 Chat com a loja
                </button>
              </div>
            )}
          </div>
        ))}
        {ativos.length === 0 && <p className="text-gray-500 text-sm">Nenhum pedido em andamento.</p>}
      </div>

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
