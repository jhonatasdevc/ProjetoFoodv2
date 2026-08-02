"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CriarPedidoInput } from "@delivery/shared";
import { criarPedido } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

const FORMAS_PAGAMENTO: { value: CriarPedidoInput["formaPagamento"]; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de crédito (na entrega)" },
  { value: "cartao_debito", label: "Cartão de débito (na entrega)" },
];

export function CheckoutForm({ idLoja, onClose }: { idLoja: number; onClose: () => void }) {
  const { lines, total, clear } = useCart();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<CriarPedidoInput["formaPagamento"]>("pix");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const pedido = await criarPedido({
        idLoja,
        clienteNome: nome,
        clienteTelefone: telefone,
        enderecoTexto: endereco,
        formaPagamento,
        observacoes: observacoes || undefined,
        itens: lines.map((l) => ({
          idItem: l.idItem,
          quantidade: l.quantidade,
          complementos: l.complementos.map((c) => ({ idItemComplemento: c.idItemComplemento })),
        })),
      });
      clear();
      router.push(`/pedido/${pedido.id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar pedido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Finalizar pedido</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Nome</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Telefone</label>
          <input
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Endereço de entrega</label>
          <textarea
            required
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            rows={2}
            placeholder="Rua, número, bairro, referência..."
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Forma de pagamento</label>
          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value as CriarPedidoInput["formaPagamento"])}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Observações (opcional)</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-red-600 text-white font-semibold py-3 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : `Confirmar pedido — ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
        </button>
      </form>
    </div>
  );
}
