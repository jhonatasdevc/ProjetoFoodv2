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

export interface Loja {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  endereco: string | null;
  ativo: boolean;
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
  imagemUrl: string | null;
  disponivel: boolean;
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
  clienteNome: string;
  clienteTelefone: string;
  enderecoTexto: string;
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
  clienteNome: string;
  clienteTelefone: string;
  enderecoTexto: string;
  formaPagamento: string;
  status: PedidoStatus;
  total: number;
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

export const SOCKET_EVENTS = {
  PEDIDO_CRIADO: "pedido:criado",
  PEDIDO_ATUALIZADO: "pedido:atualizado",
} as const;
