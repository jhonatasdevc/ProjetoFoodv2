import type {
  AtualizarPerfilInput,
  CardapioResponse,
  CarteiraResponse,
  CriarEnderecoInput,
  CriarPedidoInput,
  Cupom,
  Endereco,
  Favorito,
  Grupo,
  MensagemPedido,
  NovaPushSubscriptionInput,
  Pedido,
  SolicitarOtpInput,
  SolicitarOtpResponse,
  StoriesLoja,
  Usuario,
  ValidarCupomInput,
  ValidarCupomResponse,
  VerificarOtpInput,
  VerificarOtpResponse,
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

export function getGrupos(): Promise<Grupo[]> {
  return request("/api/grupos", null);
}

export function getCardapio(idLoja: string | number): Promise<CardapioResponse> {
  return request(`/api/lojas/${idLoja}/cardapio`, null);
}

export function getPedido(id: string | number): Promise<Pedido> {
  return request(`/api/pedidos/${id}`, null);
}

export function criarPedido(token: string, input: CriarPedidoInput): Promise<Pedido> {
  return request("/api/pedidos", token, { method: "POST", body: JSON.stringify(input) });
}

export function solicitarOtp(input: SolicitarOtpInput): Promise<SolicitarOtpResponse> {
  return request("/api/usuarios/otp/solicitar", null, { method: "POST", body: JSON.stringify(input) });
}

export function verificarOtp(input: VerificarOtpInput): Promise<VerificarOtpResponse> {
  return request("/api/usuarios/otp/verificar", null, { method: "POST", body: JSON.stringify(input) });
}

export function getUsuarioMe(token: string): Promise<Usuario> {
  return request("/api/usuarios/me", token);
}

export function patchUsuarioMe(token: string, input: AtualizarPerfilInput): Promise<Usuario> {
  return request("/api/usuarios/me", token, { method: "PATCH", body: JSON.stringify(input) });
}

export function listEnderecos(token: string): Promise<Endereco[]> {
  return request("/api/usuarios/me/enderecos", token);
}

export function criarEndereco(token: string, input: CriarEnderecoInput): Promise<Endereco> {
  return request("/api/usuarios/me/enderecos", token, { method: "POST", body: JSON.stringify(input) });
}

export function editarEndereco(token: string, id: number, input: Partial<CriarEnderecoInput>): Promise<Endereco> {
  return request(`/api/usuarios/me/enderecos/${id}`, token, { method: "PUT", body: JSON.stringify(input) });
}

export function excluirEndereco(token: string, id: number): Promise<void> {
  return request(`/api/usuarios/me/enderecos/${id}`, token, { method: "DELETE" });
}

export function validarCupom(token: string, input: ValidarCupomInput): Promise<ValidarCupomResponse> {
  return request("/api/cupons/validar", token, { method: "POST", body: JSON.stringify(input) });
}

export function getCuponsAtivos(): Promise<Cupom[]> {
  return request("/api/cupons/ativos", null);
}

export function getMeusPedidos(token: string): Promise<Pedido[]> {
  return request("/api/usuarios/me/pedidos", token);
}

export function getStories(): Promise<StoriesLoja[]> {
  return request("/api/stories", null);
}

export function listFavoritos(token: string): Promise<Favorito[]> {
  return request("/api/usuarios/me/favoritos", token);
}

export function favoritarLoja(token: string, idLoja: number): Promise<Favorito> {
  return request("/api/usuarios/me/favoritos", token, { method: "POST", body: JSON.stringify({ idLoja }) });
}

export function desfavoritarLoja(token: string, idLoja: number): Promise<void> {
  return request(`/api/usuarios/me/favoritos/${idLoja}`, token, { method: "DELETE" });
}

export function inscreverPush(token: string, input: NovaPushSubscriptionInput): Promise<{ inscrito: true }> {
  return request("/api/usuarios/me/push", token, { method: "POST", body: JSON.stringify(input) });
}

export function listMensagens(token: string, idPedido: number): Promise<MensagemPedido[]> {
  return request(`/api/pedidos/${idPedido}/mensagens`, token);
}

export function enviarMensagem(token: string, idPedido: number, texto: string): Promise<MensagemPedido> {
  return request(`/api/pedidos/${idPedido}/mensagens`, token, { method: "POST", body: JSON.stringify({ texto }) });
}

export function getCarteira(token: string): Promise<CarteiraResponse> {
  return request("/api/usuarios/me/carteira", token);
}
