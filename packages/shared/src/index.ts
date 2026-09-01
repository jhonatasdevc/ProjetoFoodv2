export type PedidoStatus =
  | "recebido"
  | "preparando"
  | "saiu_entrega"
  | "entregue"
  | "cancelado";

export const PEDIDO_STATUS_ORDER: PedidoStatus[] = [
  "recebido",
  "preparando",
  "saiu_entrega",
  "entregue",
];

export const PEDIDO_STATUS_LABEL: Record<PedidoStatus, string> = {
  recebido: "Recebido",
  preparando: "Preparando",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

// Como a loja cobra a entrega — só é relevante quando a loja aceita entrega (aceitaEntrega).
export type TipoFrete = "gratis" | "pago";

// O que o CLIENTE escolheu num pedido específico — a loja pode aceitar entrega e retirada
// ao mesmo tempo (não é exclusivo), então essa escolha é por pedido, não da loja.
export type TipoEntregaPedido = "entrega" | "retirada";

// Pro pedido de retirada, "saiu para entrega" não faz sentido — o rótulo vira "Pedido pronto"
// (pronto pra o cliente buscar). Usado em qualquer tela que mostre o status de um pedido.
export function labelStatusPedido(status: PedidoStatus, tipoEntrega: TipoEntregaPedido): string {
  if (tipoEntrega === "retirada" && status === "saiu_entrega") return "Pedido pronto";
  return PEDIDO_STATUS_LABEL[status];
}

export interface Loja {
  id: number;
  idGrupo: number;
  nome: string;
  email: string;
  telefone: string | null;
  endereco: string | null;
  imagemUrl: string | null;
  imagemPerfilUrl: string | null;
  // Entrega e retirada não são exclusivas — a loja pode oferecer as duas ao mesmo tempo,
  // e o cliente escolhe no checkout (ver CriarPedidoInput.tipoEntrega).
  aceitaEntrega: boolean;
  tipoFrete: TipoFrete;
  valorFrete: number | null;
  aceitaRetirada: boolean;
  ativo: boolean;
  // Só vem preenchido nas rotas públicas voltadas pro cliente (GET /lojas/:id, cardápio,
  // grupos) — nas telas de admin/loja não é calculado.
  abertaAgora?: boolean;
  // Só vem preenchido no cardápio (GET /lojas/:id/cardapio) — contagem de favoritos.
  totalFavoritos?: number;
}

export interface HorarioFuncionamento {
  diaSemana: number;
  abreEm: string | null;
  fechaEm: string | null;
  fechado: boolean;
}

export interface AtualizarHorarioInput {
  diaSemana: number;
  abreEm: string | null;
  fechaEm: string | null;
  fechado: boolean;
}

export interface FechamentoTemporario {
  id: number;
  inicio: string;
  fim: string;
  motivo: string | null;
  criadoEm: string;
}

export interface NovoFechamentoInput {
  inicio: string;
  fim: string;
  motivo?: string;
}

export interface AtualizarLojaInput {
  imagemUrl?: string | null;
  imagemPerfilUrl?: string | null;
  aceitaEntrega?: boolean;
  tipoFrete?: TipoFrete;
  valorFrete?: number | null;
  aceitaRetirada?: boolean;
  ativo?: boolean;
}

export interface Grupo {
  id: number;
  nome: string;
  ordem: number;
  ativo: boolean;
  lojas: Loja[];
}

export interface ItemComplemento {
  id: number;
  idItem: number;
  nome: string;
  precoAdicional: number;
  disponivel: boolean;
}

export interface Item {
  id: number;
  idCategoria: number;
  nome: string;
  descricao: string | null;
  preco: number;
  precoPromocional: number | null;
  imagemUrl: string | null;
  disponivel: boolean;
  destaque: boolean;
  ordem: number;
  complementos: ItemComplemento[];
}

export interface Categoria {
  id: number;
  idLoja: number;
  nome: string;
  ordem: number;
  itens: Item[];
}

export interface CardapioResponse {
  loja: Loja;
  categorias: Categoria[];
}

export interface PedidoItemComplementoInput {
  idItemComplemento: number;
}

export interface PedidoItemInput {
  idItem: number;
  quantidade: number;
  observacao?: string;
  complementos?: PedidoItemComplementoInput[];
}

export interface CriarPedidoInput {
  idLoja: number;
  tipoEntrega: TipoEntregaPedido;
  idEndereco?: number;
  cupomCodigo?: string;
  formaPagamento: "dinheiro" | "pix" | "cartao_credito" | "cartao_debito";
  observacoes?: string;
  itens: PedidoItemInput[];
}

export interface PedidoItemComplemento {
  id: number;
  idItemComplemento: number;
  nome: string;
  precoAdicional: number;
}

export interface PedidoItem {
  id: number;
  idItem: number;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  observacao: string | null;
  complementos: PedidoItemComplemento[];
}

export interface Pedido {
  id: number;
  idLoja: number;
  lojaNome: string;
  idUsuario: number;
  idEndereco: number | null;
  idCupom: number | null;
  clienteNome: string;
  clienteTelefone: string;
  enderecoTexto: string;
  formaPagamento: string;
  status: PedidoStatus;
  total: number;
  valorDesconto: number;
  valorFrete: number;
  tipoEntrega: TipoEntregaPedido;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  itens: PedidoItem[];
}

export interface LoginLojaInput {
  email: string;
  senha: string;
}

export interface LoginLojaResponse {
  token: string;
  loja: Loja;
}

export interface Endereco {
  id: number;
  idUsuario: number;
  cep: string;
  cidade: string;
  estado: string;
  rua: string;
  numero: string;
  complemento: string | null;
  referencia: string | null;
  padrao: boolean;
}

export interface CriarEnderecoInput {
  cep: string;
  cidade: string;
  estado: string;
  rua: string;
  numero: string;
  complemento?: string;
  referencia?: string;
  padrao?: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  sobrenome: string;
  telefone: string;
  enderecos: Endereco[];
}

export interface AtualizarPerfilInput {
  nome?: string;
  sobrenome?: string;
}

export interface SolicitarOtpInput {
  telefone: string;
}

export interface SolicitarOtpResponse {
  enviado: true;
  codigoDev: string;
}

export interface VerificarOtpInput {
  telefone: string;
  codigo: string;
  nome?: string;
  sobrenome?: string;
}

export type VerificarOtpResponse =
  | { precisaCadastro: true }
  | { precisaCadastro: false; token: string; usuario: Usuario };

export interface ValidarCupomInput {
  codigo: string;
  subtotal: number;
}

export type ValidarCupomResponse =
  | { valido: true; idCupom: number; valorDesconto: number }
  | { valido: false; erro: string };

export interface Admin {
  id: number;
  nome: string;
  email: string;
}

export interface LoginAdminInput {
  email: string;
  senha: string;
}

export interface LoginAdminResponse {
  token: string;
  admin: Admin;
}

export interface NovaLojaAdminInput {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  endereco?: string;
  idGrupo: number;
}

export interface EditarLojaAdminInput {
  nome?: string;
  telefone?: string;
  endereco?: string;
  idGrupo?: number;
  ativo?: boolean;
  senha?: string;
}

export interface NovoGrupoInput {
  nome: string;
  ordem?: number;
}

export interface EditarGrupoInput {
  nome?: string;
  ordem?: number;
  ativo?: boolean;
}

export interface Cupom {
  id: number;
  codigo: string;
  tipoDesconto: "percentual" | "valor_fixo";
  valorDesconto: number;
  ativo: boolean;
  validoAte: string | null;
}

export type PercentualCupom = 5 | 10 | 15 | 20;

export interface NovoCupomAdminInput {
  codigo: string;
  valorDesconto: PercentualCupom;
  validoAte?: string;
}

export interface EditarCupomAdminInput {
  ativo?: boolean;
  validoAte?: string | null;
}

export interface Story {
  id: number;
  imagemUrl: string;
  criadoEm: string;
}

export interface StoriesLoja {
  idLoja: number;
  lojaNome: string;
  lojaImagemUrl: string | null;
  stories: Story[];
}

export interface NovoStoryInput {
  imagemUrl: string;
}

export interface Favorito {
  idLoja: number;
  lojaNome: string;
  lojaImagemUrl: string | null;
  criadoEm: string;
}

// Espelha o formato de PushSubscription.toJSON() do navegador.
export interface NovaPushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Índice = dia_semana no banco (0=domingo, igual ao Date.getDay() do JS).
export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export type RemetenteMensagem = "cliente" | "loja";

export interface MensagemPedido {
  id: number;
  idPedido: number;
  remetente: RemetenteMensagem;
  texto: string;
  criadoEm: string;
}

export interface NovaMensagemInput {
  texto: string;
}

// Status em que o pedido ainda está "em andamento" — chat e contador de tempo só fazem
// sentido nesses (usado tanto no front quanto validado de novo no backend).
export const STATUS_PEDIDO_EM_ANDAMENTO: PedidoStatus[] = ["recebido", "preparando", "saiu_entrega"];

export const SOCKET_EVENTS = {
  PEDIDO_CRIADO: "pedido:criado",
  PEDIDO_ATUALIZADO: "pedido:atualizado",
  MENSAGEM_NOVA: "mensagem:nova",
} as const;


