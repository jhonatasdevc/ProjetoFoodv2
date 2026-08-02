import type {
  Categoria,
  CardapioResponse,
  Item,
  LoginLojaInput,
  LoginLojaResponse,
  Pedido,
  PedidoStatus,
} from "@delivery/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

async function request<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.erro ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function loginLoja(input: LoginLojaInput): Promise<LoginLojaResponse> {
  return request("/api/loja/login", null, { method: "POST", body: JSON.stringify(input) });
}

export function getCardapio(idLoja: number, token: string): Promise<CardapioResponse> {
  return request(`/api/lojas/${idLoja}/cardapio`, token);
}

export function listPedidos(token: string, status?: PedidoStatus): Promise<Pedido[]> {
  const qs = status ? `?status=${status}` : "";
  return request(`/api/pedidos${qs}`, token);
}

export function avancarStatusPedido(token: string, id: number, status: PedidoStatus): Promise<Pedido> {
  return request(`/api/pedidos/${id}/status`, token, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function criarCategoria(token: string, nome: string, ordem?: number): Promise<Categoria> {
  return request("/api/categorias", token, { method: "POST", body: JSON.stringify({ nome, ordem }) });
}

export function editarCategoria(token: string, id: number, dados: Partial<{ nome: string; ordem: number }>): Promise<Categoria> {
  return request(`/api/categorias/${id}`, token, { method: "PUT", body: JSON.stringify(dados) });
}

export function excluirCategoria(token: string, id: number): Promise<void> {
  return request(`/api/categorias/${id}`, token, { method: "DELETE" });
}

export interface NovoItemInput {
  idCategoria: number;
  nome: string;
  descricao?: string;
  preco: number;
  disponivel?: boolean;
}

export function criarItem(token: string, dados: NovoItemInput): Promise<Item> {
  return request("/api/itens", token, { method: "POST", body: JSON.stringify(dados) });
}

export function editarItem(token: string, id: number, dados: Partial<NovoItemInput>): Promise<Item> {
  return request(`/api/itens/${id}`, token, { method: "PUT", body: JSON.stringify(dados) });
}

export function excluirItem(token: string, id: number): Promise<void> {
  return request(`/api/itens/${id}`, token, { method: "DELETE" });
}
