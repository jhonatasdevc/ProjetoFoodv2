import type { Prisma } from "@prisma/client";
import type {
  Admin,
  Categoria,
  Cupom,
  Endereco,
  Favorito,
  FechamentoTemporario,
  Grupo,
  HorarioFuncionamento,
  Item,
  ItemComplemento,
  Loja,
  MensagemPedido,
  Pedido,
  PedidoItem,
  PedidoItemComplemento,
  PedidoStatus,
  RemetenteMensagem,
  Story,
  TipoEntregaPedido,
  TipoFrete,
  Usuario,
} from "@delivery/shared";
import { lojaEstaAberta } from "./horario.js";

const num = (v: Prisma.Decimal | number) => Number(v);

export function serializeLoja(loja: {
  id: number;
  idGrupo: number;
  nome: string;
  arroba: string;
  email: string;
  telefone: string | null;
  endereco: string | null;
  imagemUrl: string | null;
  imagemPerfilUrl: string | null;
  aceitaEntrega: boolean;
  tipoFrete: string;
  valorFrete: Prisma.Decimal | number | null;
  aceitaRetirada: boolean;
  ativo: boolean;
  totalFavoritos?: number;
}): Loja {
  return {
    id: loja.id,
    idGrupo: loja.idGrupo,
    nome: loja.nome,
    arroba: loja.arroba,
    email: loja.email,
    telefone: loja.telefone,
    endereco: loja.endereco,
    imagemUrl: loja.imagemUrl,
    imagemPerfilUrl: loja.imagemPerfilUrl,
    aceitaEntrega: loja.aceitaEntrega,
    tipoFrete: loja.tipoFrete as TipoFrete,
    valorFrete: loja.valorFrete != null ? num(loja.valorFrete) : null,
    aceitaRetirada: loja.aceitaRetirada,
    ativo: loja.ativo,
    ...(loja.totalFavoritos !== undefined ? { totalFavoritos: loja.totalFavoritos } : {}),
  };
}

export function serializeHorario(h: {
  diaSemana: number;
  abreEm: string | null;
  fechaEm: string | null;
  fechado: boolean;
}): HorarioFuncionamento {
  return { diaSemana: h.diaSemana, abreEm: h.abreEm, fechaEm: h.fechaEm, fechado: h.fechado };
}

export function serializeFechamento(f: {
  id: number;
  inicio: Date;
  fim: Date;
  motivo: string | null;
  criadoEm: Date;
}): FechamentoTemporario {
  return {
    id: f.id,
    inicio: f.inicio.toISOString(),
    fim: f.fim.toISOString(),
    motivo: f.motivo,
    criadoEm: f.criadoEm.toISOString(),
  };
}

// Igual serializeLoja, mas também calcula abertaAgora a partir do horário semanal +
// fechamentos temporários — usado nas rotas públicas que o cliente consulta.
export function serializeLojaComHorario(
  loja: Parameters<typeof serializeLoja>[0] & {
    horarios: { diaSemana: number; abreEm: string | null; fechaEm: string | null; fechado: boolean }[];
    fechamentos: { inicio: Date; fim: Date }[];
  },
): Loja {
  return {
    ...serializeLoja(loja),
    abertaAgora: lojaEstaAberta(loja.horarios, loja.fechamentos),
  };
}

export function serializeGrupo(grupo: {
  id: number;
  nome: string;
  ordem: number;
  ativo: boolean;
  lojas: Parameters<typeof serializeLojaComHorario>[0][];
}): Grupo {
  return {
    id: grupo.id,
    nome: grupo.nome,
    ordem: grupo.ordem,
    ativo: grupo.ativo,
    lojas: grupo.lojas.map(serializeLojaComHorario),
  };
}

export function serializeGrupoAdmin(grupo: { id: number; nome: string; ordem: number; ativo: boolean }): Grupo {
  return { id: grupo.id, nome: grupo.nome, ordem: grupo.ordem, ativo: grupo.ativo, lojas: [] };
}

export function serializeAdmin(admin: { id: number; nome: string; email: string }): Admin {
  return { id: admin.id, nome: admin.nome, email: admin.email };
}

export function serializeCupom(cupom: {
  id: number;
  codigo: string;
  tipoDesconto: string;
  valorDesconto: Prisma.Decimal | number;
  ativo: boolean;
  validoAte: Date | null;
}): Cupom {
  return {
    id: cupom.id,
    codigo: cupom.codigo,
    tipoDesconto: cupom.tipoDesconto as Cupom["tipoDesconto"],
    valorDesconto: num(cupom.valorDesconto),
    ativo: cupom.ativo,
    validoAte: cupom.validoAte ? cupom.validoAte.toISOString() : null,
  };
}

export function serializeStory(story: { id: number; imagemUrl: string; criadoEm: Date }): Story {
  return {
    id: story.id,
    imagemUrl: story.imagemUrl,
    criadoEm: story.criadoEm.toISOString(),
  };
}

export function serializeFavorito(f: {
  idLoja: number;
  criadoEm: Date;
  loja: { arroba: string; nome: string; imagemUrl: string | null };
}): Favorito {
  return {
    idLoja: f.idLoja,
    lojaArroba: f.loja.arroba,
    lojaNome: f.loja.nome,
    lojaImagemUrl: f.loja.imagemUrl,
    criadoEm: f.criadoEm.toISOString(),
  };
}

export function serializeEndereco(e: {
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
}): Endereco {
  return {
    id: e.id,
    idUsuario: e.idUsuario,
    cep: e.cep,
    cidade: e.cidade,
    estado: e.estado,
    rua: e.rua,
    numero: e.numero,
    complemento: e.complemento,
    referencia: e.referencia,
    padrao: e.padrao,
  };
}

export function serializeUsuario(usuario: {
  id: number;
  nome: string;
  sobrenome: string;
  telefone: string;
  enderecos?: Parameters<typeof serializeEndereco>[0][];
}): Usuario {
  return {
    id: usuario.id,
    nome: usuario.nome,
    sobrenome: usuario.sobrenome,
    telefone: usuario.telefone,
    enderecos: (usuario.enderecos ?? []).map(serializeEndereco),
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
  precoPromocional: Prisma.Decimal | number | null;
  imagemUrl: string | null;
  disponivel: boolean;
  destaque: boolean;
  ordem: number;
  complementos?: Parameters<typeof serializeItemComplemento>[0][];
}): Item {
  return {
    id: item.id,
    idCategoria: item.idCategoria,
    nome: item.nome,
    descricao: item.descricao,
    preco: num(item.preco),
    precoPromocional: item.precoPromocional === null ? null : num(item.precoPromocional),
    imagemUrl: item.imagemUrl,
    disponivel: item.disponivel,
    destaque: item.destaque,
    ordem: item.ordem,
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
  loja: { nome: string };
  idUsuario: number;
  idEndereco: number | null;
  idCupom: number | null;
  clienteNome: string;
  clienteTelefone: string;
  enderecoTexto: string;
  formaPagamento: string;
  status: string;
  total: Prisma.Decimal | number;
  valorDesconto: Prisma.Decimal | number;
  valorFrete: Prisma.Decimal | number;
  tipoEntrega: string;
  observacoes: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
  itens: Parameters<typeof serializePedidoItem>[0][];
}): Pedido {
  return {
    id: pedido.id,
    idLoja: pedido.idLoja,
    lojaNome: pedido.loja.nome,
    idUsuario: pedido.idUsuario,
    idEndereco: pedido.idEndereco,
    idCupom: pedido.idCupom,
    clienteNome: pedido.clienteNome,
    clienteTelefone: pedido.clienteTelefone,
    enderecoTexto: pedido.enderecoTexto,
    formaPagamento: pedido.formaPagamento,
    status: pedido.status as PedidoStatus,
    total: num(pedido.total),
    valorDesconto: num(pedido.valorDesconto),
    valorFrete: num(pedido.valorFrete),
    tipoEntrega: pedido.tipoEntrega as TipoEntregaPedido,
    observacoes: pedido.observacoes,
    criadoEm: pedido.criadoEm.toISOString(),
    atualizadoEm: pedido.atualizadoEm.toISOString(),
    itens: pedido.itens.map(serializePedidoItem),
  };
}

export function serializeMensagem(m: {
  id: number;
  idPedido: number;
  remetente: string;
  texto: string;
  criadoEm: Date;
}): MensagemPedido {
  return {
    id: m.id,
    idPedido: m.idPedido,
    remetente: m.remetente as RemetenteMensagem,
    texto: m.texto,
    criadoEm: m.criadoEm.toISOString(),
  };
}
