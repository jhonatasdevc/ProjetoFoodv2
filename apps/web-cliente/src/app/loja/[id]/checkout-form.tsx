"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CriarPedidoInput, Endereco } from "@delivery/shared";
import { criarPedido, listEnderecos, validarCupom } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

const FORMAS_PAGAMENTO: { value: CriarPedidoInput["formaPagamento"]; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de crédito (na entrega)" },
  { value: "cartao_debito", label: "Cartão de débito (na entrega)" },
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CheckoutForm({ idLoja, onClose }: { idLoja: number; onClose: () => void }) {
  const { auth } = useAuth();
  const { lines, total, clear } = useCart();
  const router = useRouter();

  if (!auth) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Finalizar pedido</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600">Você precisa estar cadastrado para finalizar o pedido.</p>
          <button
            onClick={() => router.push(`/login?redirect=/loja/${idLoja}`)}
            className="w-full bg-red-600 text-white font-semibold py-3 rounded hover:bg-red-700"
          >
            Fazer cadastro
          </button>
        </div>
      </div>
    );
  }

  return <CheckoutLogado idLoja={idLoja} onClose={onClose} token={auth.token} lines={lines} total={total} clear={clear} />;
}

function CheckoutLogado({
  idLoja,
  onClose,
  token,
  lines,
  total,
  clear,
}: {
  idLoja: number;
  onClose: () => void;
  token: string;
  lines: ReturnType<typeof useCart>["lines"];
  total: number;
  clear: () => void;
}) {
  const router = useRouter();
  const [enderecos, setEnderecos] = useState<Endereco[] | null>(null);
  const [idEndereco, setIdEndereco] = useState<number | null>(null);
  const [cupomInput, setCupomInput] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{ codigo: string; valorDesconto: number } | null>(null);
  const [cupomErro, setCupomErro] = useState<string | null>(null);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<CriarPedidoInput["formaPagamento"]>("pix");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listEnderecos(token).then((resp) => {
      setEnderecos(resp);
      setIdEndereco(resp.find((e) => e.padrao)?.id ?? resp[0]?.id ?? null);
    });
  }, [token]);

  async function handleAplicarCupom() {
    if (!cupomInput.trim()) return;
    setCupomErro(null);
    setValidandoCupom(true);
    try {
      const resultado = await validarCupom(token, { codigo: cupomInput.trim(), subtotal: total });
      if (resultado.valido) {
        setCupomAplicado({ codigo: cupomInput.trim(), valorDesconto: resultado.valorDesconto });
      } else {
        setCupomAplicado(null);
        setCupomErro(resultado.erro);
      }
    } catch (err) {
      setCupomAplicado(null);
      setCupomErro(err instanceof Error ? err.message : "Erro ao validar cupom");
    } finally {
      setValidandoCupom(false);
    }
  }

  const totalComDesconto = total - (cupomAplicado?.valorDesconto ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idEndereco) return;
    setErro(null);
    setEnviando(true);
    try {
      const pedido = await criarPedido(token, {
        idLoja,
        idEndereco,
        cupomCodigo: cupomAplicado?.codigo,
        formaPagamento,
        observacoes: observacoes || undefined,
        itens: lines.map((l) => ({
          idItem: l.idItem,
          quantidade: l.quantidade,
          observacao: l.observacao,
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
          <label className="block text-sm text-gray-700 mb-2">Endereço de entrega</label>
          {enderecos === null && <p className="text-sm text-gray-500">Carregando endereços...</p>}
          {enderecos?.length === 0 && (
            <p className="text-sm text-gray-600">
              Nenhum endereço salvo.{" "}
              <Link href={`/perfil?redirect=/loja/${idLoja}`} className="text-red-600 underline">
                Cadastrar endereço
              </Link>
            </p>
          )}
          <div className="space-y-2">
            {enderecos?.map((e) => (
              <label key={e.id} className="flex items-start gap-2 text-sm text-gray-700 border border-gray-200 rounded px-3 py-2">
                <input
                  type="radio"
                  name="endereco"
                  checked={idEndereco === e.id}
                  onChange={() => setIdEndereco(e.id)}
                  className="mt-1 accent-red-600"
                />
                <span>
                  {e.rua}, {e.numero}
                  {e.complemento ? ` - ${e.complemento}` : ""} — {e.cidade}/{e.estado}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Cupom de desconto</label>
          <div className="flex gap-2">
            <input
              value={cupomInput}
              onChange={(e) => setCupomInput(e.target.value.toUpperCase())}
              placeholder="Código do cupom"
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            />
            <button
              type="button"
              onClick={handleAplicarCupom}
              disabled={validandoCupom}
              className="bg-gray-100 text-sm font-medium px-4 py-2 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
          {cupomAplicado && (
            <p className="text-sm text-green-700 mt-1">
              Cupom {cupomAplicado.codigo} aplicado: -{formatBRL(cupomAplicado.valorDesconto)}
            </p>
          )}
          {cupomErro && <p className="text-sm text-red-600 mt-1">{cupomErro}</p>}
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
          disabled={enviando || !idEndereco}
          className="w-full bg-red-600 text-white font-semibold py-3 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : `Confirmar pedido — ${formatBRL(totalComDesconto)}`}
        </button>
      </form>
    </div>
  );
}
