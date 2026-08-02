import type { CardapioResponse, CriarPedidoInput, Pedido } from "@delivery/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.erro ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getCardapio(idLoja: string | number): Promise<CardapioResponse> {
  return request(`/api/lojas/${idLoja}/cardapio`);
}

export function getPedido(id: string | number): Promise<Pedido> {
  return request(`/api/pedidos/${id}`);
}

export function criarPedido(input: CriarPedidoInput): Promise<Pedido> {
  return request("/api/pedidos", { method: "POST", body: JSON.stringify(input) });
}
