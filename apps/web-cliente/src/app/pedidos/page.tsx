"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PEDIDO_STATUS_LABEL, type Pedido } from "@delivery/shared";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "../protected-route";
import { getMeusPedidos } from "@/lib/api";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PedidosContent() {
  const { auth } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

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
          <Link
            key={pedido.id}
            href={`/pedido/${pedido.id}`}
            className="block border border-red-100 rounded-lg p-4 hover:bg-red-50"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{pedido.lojaNome}</p>
                <p className="text-sm text-green-700">{PEDIDO_STATUS_LABEL[pedido.status]}</p>
              </div>
              <p className="text-gray-600 text-sm">{formatBRL(pedido.total)}</p>
            </div>
          </Link>
        ))}
        {ativos.length === 0 && <p className="text-gray-500 text-sm">Nenhum pedido em andamento.</p>}
      </div>
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
