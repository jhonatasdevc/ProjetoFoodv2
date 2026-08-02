import type { Prisma } from "@prisma/client";
import type {
  Categoria,
  Item,
  ItemComplemento,
  Loja,
  Pedido,
  PedidoItem,
  PedidoItemComplemento,
  PedidoStatus,
} from "@delivery/shared";

const num = (v: Prisma.Decimal | number) => Number(v);

export function serializeLoja(loja: {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  endereco: string | null;
  ativo: boolean;
}): Loja {
  return {
    id: loja.id,
    nome: loja.nome,
    email: loja.email,
    telefone: loja.telefone,
    endereco: loja.endereco,
    ativo: loja.ativo,
  };
}

export function serializeItemComplemento(c: {
  id: number;
  idItem: number;
  nome: string;
  precoAdicional: Prisma.Decimal | number;
  disponivel: boolean;
}): ItemComplemento {
  return {
    id: c.id,
    idItem: c.idItem,
    nome: c.nome,
    precoAdicional: num(c.precoAdicional),
    disponivel: c.disponivel,
  };
}

export function serializeItem(item: {
  id: number;
  idCategoria: number;
  nome: string;
  descricao: string | null;
  preco: Prisma.Decimal | number;
  imagemUrl: string | null;
  disponivel: boolean;
  complementos?: Parameters<typeof serializeItemComplemento>[0][];
}): Item {
  return {
    id: item.id,
    idCategoria: item.idCategoria,
    nome: item.nome,
    descricao: item.descricao,
    preco: num(item.preco),
    imagemUrl: item.imagemUrl,
    disponivel: item.disponivel,
    complementos: (item.complementos ?? []).map(serializeItemComplemento),
  };
}

export function serializeCategoria(categoria: {
  id: number;
  idLoja: number;
  nome: string;
  ordem: number;
  itens?: Parameters<typeof serializeItem>[0][];
}): Categoria {
  return {
    id: categoria.id,
    idLoja: categoria.idLoja,
    nome: categoria.nome,
    ordem: categoria.ordem,
    itens: (categoria.itens ?? []).map(serializeItem),
  };
}

export function serializePedidoItemComplemento(c: {
  id: number;
  idItemComplemento: number;
  precoAdicional: Prisma.Decimal | number;
  itemComplemento: { nome: string };
}): PedidoItemComplemento {
  return {
    id: c.id,
    idItemComplemento: c.idItemComplemento,
    nome: c.itemComplemento.nome,
    precoAdicional: num(c.precoAdicional),
  };
}

export function serializePedidoItem(pi: {
  id: number;
  idItem: number;
  quantidade: number;
  precoUnitario: Prisma.Decimal | number;
  observacao: string | null;
  item: { nome: string };
  complementos: Parameters<typeof serializePedidoItemComplemento>[0][];
}): PedidoItem {
  return {
    id: pi.id,
    idItem: pi.idItem,
    nome: pi.item.nome,
    quantidade: pi.quantidade,
    precoUnitario: num(pi.precoUnitario),
    observacao: pi.observacao,
    complementos: pi.complementos.map(serializePedidoItemComplemento),
  };
}

export function serializePedido(pedido: {
  id: number;
  idLoja: number;
  clienteNome: string;
  clienteTelefone: string;
  enderecoTexto: string;
  formaPagamento: string;
  status: string;
  total: Prisma.Decimal | number;
  observacoes: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
  itens: Parameters<typeof serializePedidoItem>[0][];
}): Pedido {
  return {
    id: pedido.id,
    idLoja: pedido.idLoja,
    clienteNome: pedido.clienteNome,
    clienteTelefone: pedido.clienteTelefone,
    enderecoTexto: pedido.enderecoTexto,
    formaPagamento: pedido.formaPagamento,
    status: pedido.status as PedidoStatus,
    total: num(pedido.total),
    observacoes: pedido.observacoes,
    criadoEm: pedido.criadoEm.toISOString(),
    atualizadoEm: pedido.atualizadoEm.toISOString(),
    itens: pedido.itens.map(serializePedidoItem),
  };
}
