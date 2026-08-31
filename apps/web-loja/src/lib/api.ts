import type {
  AtualizarHorarioInput,
  AtualizarLojaInput,
  Categoria,
  CardapioResponse,
  FechamentoTemporario,
  HorarioFuncionamento,
  Item,
  Loja,
  LoginLojaInput,
  LoginLojaResponse,
  NovoFechamentoInput,
  NovoStoryInput,
  Pedido,
  PedidoStatus,
  Story,
} from "@delivery/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

async function request<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
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

export function atualizarLojaMe(token: string, dados: AtualizarLojaInput): Promise<Loja> {
  return request("/api/loja/me", token, { method: "PATCH", body: JSON.stringify(dados) });
}

// Não usa request<T>() — envia multipart/form-data, o navegador precisa definir o boundary sozinho.
export async function uploadImagem(token: string, arquivo: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);

  const res = await fetch(`${API_URL}/api/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.erro ?? `Erro ${res.status}`);
  }
  return res.json();
}

export function listPedidos(
  token: string,
  filtros?: { status?: PedidoStatus; de?: string; ate?: string },
): Promise<Pedido[]> {
  const params = new URLSearchParams();
  if (filtros?.status) params.set("status", filtros.status);
  if (filtros?.de) params.set("de", filtros.de);
  if (filtros?.ate) params.set("ate", filtros.ate);
  const qs = params.toString();
  return request(`/api/pedidos${qs ? `?${qs}` : ""}`, token);
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
  precoPromocional?: number | null;
  imagemUrl?: string | null;
  disponivel?: boolean;
  destaque?: boolean;
  ordem?: number;
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

export function listStories(token: string): Promise<Story[]> {
  return request("/api/loja/stories", token);
}

export function criarStory(token: string, dados: NovoStoryInput): Promise<Story> {
  return request("/api/loja/stories", token, { method: "POST", body: JSON.stringify(dados) });
}

export function excluirStory(token: string, id: number): Promise<void> {
  return request(`/api/loja/stories/${id}`, token, { method: "DELETE" });
}

export function getHorarios(token: string): Promise<{ horarios: HorarioFuncionamento[]; abertaAgora: boolean }> {
  return request("/api/loja/horarios", token);
}

export function salvarHorarios(token: string, horarios: AtualizarHorarioInput[]): Promise<HorarioFuncionamento[]> {
  return request("/api/loja/horarios", token, { method: "PUT", body: JSON.stringify(horarios) });
}

export function listFechamentos(token: string): Promise<FechamentoTemporario[]> {
  return request("/api/loja/fechamentos", token);
}

export function criarFechamento(token: string, dados: NovoFechamentoInput): Promise<FechamentoTemporario> {
  return request("/api/loja/fechamentos", token, { method: "POST", body: JSON.stringify(dados) });
}

export function excluirFechamento(token: string, id: number): Promise<void> {
  return request(`/api/loja/fechamentos/${id}`, token, { method: "DELETE" });
}
