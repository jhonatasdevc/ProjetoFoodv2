import type {
  Admin,
  Cupom,
  EditarCupomAdminInput,
  EditarGrupoInput,
  EditarLojaAdminInput,
  Grupo,
  Loja,
  LoginAdminInput,
  LoginAdminResponse,
  NovaLojaAdminInput,
  NovoCupomAdminInput,
  NovoGrupoInput,
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

export function loginAdmin(input: LoginAdminInput): Promise<LoginAdminResponse> {
  return request("/api/admin/login", null, { method: "POST", body: JSON.stringify(input) });
}

export function getAdminMe(token: string): Promise<Admin> {
  return request("/api/admin/me", token);
}

export function listLojasAdmin(token: string): Promise<Loja[]> {
  return request("/api/admin/lojas", token);
}

export function criarLojaAdmin(token: string, dados: NovaLojaAdminInput): Promise<Loja> {
  return request("/api/admin/lojas", token, { method: "POST", body: JSON.stringify(dados) });
}

export function editarLojaAdmin(token: string, id: number, dados: EditarLojaAdminInput): Promise<Loja> {
  return request(`/api/admin/lojas/${id}`, token, { method: "PUT", body: JSON.stringify(dados) });
}

export function listGruposAdmin(token: string): Promise<Grupo[]> {
  return request("/api/admin/grupos", token);
}

export function criarGrupo(token: string, dados: NovoGrupoInput): Promise<Grupo> {
  return request("/api/admin/grupos", token, { method: "POST", body: JSON.stringify(dados) });
}

export function editarGrupo(token: string, id: number, dados: EditarGrupoInput): Promise<Grupo> {
  return request(`/api/admin/grupos/${id}`, token, { method: "PUT", body: JSON.stringify(dados) });
}

export function excluirGrupo(token: string, id: number): Promise<void> {
  return request(`/api/admin/grupos/${id}`, token, { method: "DELETE" });
}

export function listCuponsAdmin(token: string): Promise<Cupom[]> {
  return request("/api/admin/cupons", token);
}

export function criarCupom(token: string, dados: NovoCupomAdminInput): Promise<Cupom> {
  return request("/api/admin/cupons", token, { method: "POST", body: JSON.stringify(dados) });
}

export function editarCupom(token: string, id: number, dados: EditarCupomAdminInput): Promise<Cupom> {
  return request(`/api/admin/cupons/${id}`, token, { method: "PUT", body: JSON.stringify(dados) });
}
