"use client";

import { useEffect, useState } from "react";
import { labelStatusPedido, PEDIDO_STATUS_ORDER, type Pedido } from "@delivery/shared";
import { getPedido } from "@/lib/api";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PedidoClient({ idPedido }: { idPedido: string }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const carregar = () =>
      getPedido(idPedido)
        .then((p) => ativo && setPedido(p))
        .catch((err) => ativo && setErro(err instanceof Error ? err.message : "Erro ao carregar pedido"));

    carregar();
    const intervalo = setInterval(carregar, 5000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [idPedido]);

  if (erro) return <p className="p-6 text-center text-red-600">{erro}</p>;
  if (!pedido) return <p className="p-6 text-center text-gray-500">Carregando pedido...</p>;

  const cancelado = pedido.status === "cancelado";
  const passoAtual = PEDIDO_STATUS_ORDER.indexOf(pedido.status);

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold text-gray-900">Pedido #{pedido.id}</h1>
      <p className="text-sm text-gray-500 mt-1">{pedido.clienteNome} · {pedido.enderecoTexto}</p>

      {cancelado ? (
        <p className="mt-6 text-red-600 font-semibold">Pedido cancelado</p>
      ) : (
        <ol className="mt-6 space-y-3">
          {PEDIDO_STATUS_ORDER.map((status, i) => (
            <li key={status} className={`flex items-center gap-3 ${i <= passoAtual ? "text-green-700" : "text-gray-400"}`}>
              <span
                className={`w-3 h-3 rounded-full ${i <= passoAtual ? "bg-green-600" : "bg-gray-300"}`}
              />
              {labelStatusPedido(status, pedido.tipoEntrega)}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 border-t border-red-100 pt-4">
        <h2 className="font-semibold text-gray-900 mb-2">Itens</h2>
        <ul className="space-y-1 text-sm text-gray-700">
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
        <div className="mt-3">
          {pedido.valorDesconto > 0 && (
            <p className="text-sm text-green-700">Desconto do cupom: -{formatBRL(pedido.valorDesconto)}</p>
          )}
          <p className="font-semibold text-gray-900">Total: {formatBRL(pedido.total)}</p>
        </div>
      </div>
    </div>
  );
}
