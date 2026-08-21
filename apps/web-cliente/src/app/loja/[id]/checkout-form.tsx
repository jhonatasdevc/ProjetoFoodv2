"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CriarPedidoInput, Endereco, TipoEntregaPedido, TipoFrete } from "@delivery/shared";
import { criarPedido, listEnderecos, validarCupom } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCart, type CartLine } from "@/lib/cart-context";

const FORMAS_PAGAMENTO: { value: CriarPedidoInput["formaPagamento"]; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de crédito (na entrega)" },
  { value: "cartao_debito", label: "Cartão de débito (na entrega)" },
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ItensCarrinho({
  lines,
  changeQuantity,
  removeLine,
}: {
  lines: CartLine[];
  changeQuantity: (key: string, quantidade: number) => void;
  removeLine: (key: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Seu carrinho</h3>
      <div className="space-y-3">
        {lines.map((l) => {
          const precoLinha = l.precoUnitario + l.complementos.reduce((s, c) => s + c.precoAdicional, 0);
          return (
            <div key={l.key} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{l.nome}</p>
                {l.complementos.length > 0 && (
                  <p className="text-xs text-gray-500 truncate">{l.complementos.map((c) => c.nome).join(", ")}</p>
                )}
                {l.observacao && <p className="text-xs text-gray-500 italic">Obs: {l.observacao}</p>}
                <p className="text-sm text-red-600 font-semibold mt-1">{formatBRL(precoLinha)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => changeQuantity(l.key, l.quantidade - 1)}
                  className="w-6 h-6 rounded border border-gray-300 text-gray-700 text-sm leading-none"
                >
                  −
                </button>
                <span className="text-sm w-4 text-center">{l.quantidade}</span>
                <button
                  type="button"
                  onClick={() => changeQuantity(l.key, l.quantidade + 1)}
                  className="w-6 h-6 rounded border border-gray-300 text-gray-700 text-sm leading-none"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => removeLine(l.key)}
                  className="text-red-600 text-xs ml-1 hover:text-red-800"
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CheckoutForm({
  idLoja,
  aceitaEntrega,
  tipoFrete,
  valorFrete,
  aceitaRetirada,
  enderecoLoja,
  onClose,
}: {
  idLoja: number;
  aceitaEntrega: boolean;
  tipoFrete: TipoFrete;
  valorFrete: number | null;
  aceitaRetirada: boolean;
  enderecoLoja: string | null;
  onClose: () => void;
}) {
  const { auth } = useAuth();
  const { lines, total, clear, changeQuantity, removeLine } = useCart();
  const router = useRouter();

  if (!auth) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Finalizar pedido</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>
          <ItensCarrinho lines={lines} changeQuantity={changeQuantity} removeLine={removeLine} />
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

  return (
    <CheckoutLogado
      idLoja={idLoja}
      aceitaEntrega={aceitaEntrega}
      tipoFrete={tipoFrete}
      valorFrete={valorFrete}
      aceitaRetirada={aceitaRetirada}
      enderecoLoja={enderecoLoja}
      onClose={onClose}
      token={auth.token}
      lines={lines}
      total={total}
      clear={clear}
      changeQuantity={changeQuantity}
      removeLine={removeLine}
    />
  );
}

function CheckoutLogado({
  idLoja,
  aceitaEntrega,
  tipoFrete,
  valorFrete,
  aceitaRetirada,
  enderecoLoja,
  onClose,
  token,
  lines,
  total,
  clear,
  changeQuantity,
  removeLine,
}: {
  idLoja: number;
  aceitaEntrega: boolean;
  tipoFrete: TipoFrete;
  valorFrete: number | null;
  aceitaRetirada: boolean;
  enderecoLoja: string | null;
  onClose: () => void;
  token: string;
  lines: CartLine[];
  total: number;
  clear: () => void;
  changeQuantity: (key: string, quantidade: number) => void;
  removeLine: (key: string) => void;
}) {
  const router = useRouter();
  // Se a loja aceita as duas, o cliente escolhe (padrão: entrega). Se só aceita uma, usa
  // essa direto, sem mostrar seletor.
  const [modoEntrega, setModoEntrega] = useState<TipoEntregaPedido>(aceitaEntrega ? "entrega" : "retirada");
  const retirada = modoEntrega === "retirada";
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
    if (retirada) return;
    listEnderecos(token).then((resp) => {
      setEnderecos(resp);
      setIdEndereco(resp.find((e) => e.padrao)?.id ?? resp[0]?.id ?? null);
    });
  }, [token, retirada]);

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

  const valorFreteCobrado = !retirada && tipoFrete === "pago" ? (valorFrete ?? 0) : 0;
  const totalComDesconto = total - (cupomAplicado?.valorDesconto ?? 0) + valorFreteCobrado;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!retirada && !idEndereco) return;
    setErro(null);
    setEnviando(true);
    try {
      const pedido = await criarPedido(token, {
        idLoja,
        tipoEntrega: modoEntrega,
        idEndereco: retirada ? undefined : (idEndereco ?? undefined),
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

        <ItensCarrinho lines={lines} changeQuantity={changeQuantity} removeLine={removeLine} />

        {aceitaEntrega && aceitaRetirada && (
          <div>
            <label className="block text-sm text-gray-700 mb-2">Como você quer receber?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModoEntrega("entrega")}
                className={`text-sm font-medium py-2 rounded-lg border ${
                  modoEntrega === "entrega" ? "bg-red-600 border-red-600 text-white" : "border-gray-300 text-gray-700"
                }`}
              >
                Entrega
              </button>
              <button
                type="button"
                onClick={() => setModoEntrega("retirada")}
                className={`text-sm font-medium py-2 rounded-lg border ${
                  modoEntrega === "retirada" ? "bg-red-600 border-red-600 text-white" : "border-gray-300 text-gray-700"
                }`}
              >
                Retirada
              </button>
            </div>
          </div>
        )}

        {retirada ? (
          <div className="border border-green-200 bg-green-50 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800">Clique e retire — sem entrega</p>
            <p className="text-sm text-green-700 mt-0.5">Retirada em: {enderecoLoja ?? "endereço da loja"}</p>
          </div>
        ) : (
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
        )}

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

        <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatBRL(total)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Frete</span>
            <span>{retirada ? "Retirada no local" : tipoFrete === "gratis" ? "Grátis" : formatBRL(valorFreteCobrado)}</span>
          </div>
          {cupomAplicado && (
            <div className="flex justify-between text-green-700">
              <span>Desconto</span>
              <span>-{formatBRL(cupomAplicado.valorDesconto)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 pt-1">
            <span>Total</span>
            <span>{formatBRL(totalComDesconto)}</span>
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando || (!retirada && !idEndereco)}
          className="w-full bg-red-600 text-white font-semibold py-3 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : `Confirmar pedido — ${formatBRL(totalComDesconto)}`}
        </button>
      </form>
    </div>
  );
}
