-- Schema inicial do MVP de delivery.
-- Decisões do MVP (ver claude.md): sem login de cliente (checkout com nome/telefone
-- em texto livre), endereço em texto livre, pagamento mock, sem tabela de entregador,
-- login da loja é usuário/senha simples (uma credencial por loja, não multi-usuário).

CREATE TABLE loja (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  senha_hash      VARCHAR(200) NOT NULL,
  telefone        VARCHAR(20),
  endereco        VARCHAR(200),
  ativo           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE categoria (
  id              SERIAL PRIMARY KEY,
  id_loja         INTEGER NOT NULL REFERENCES loja(id) ON DELETE CASCADE,
  nome            VARCHAR(120) NOT NULL,
  ordem           INTEGER NOT NULL DEFAULT 0,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE item (
  id              SERIAL PRIMARY KEY,
  id_categoria    INTEGER NOT NULL REFERENCES categoria(id) ON DELETE CASCADE,
  nome            VARCHAR(120) NOT NULL,
  descricao       TEXT,
  preco           NUMERIC(10,2) NOT NULL,
  imagem_url      VARCHAR(300),
  disponivel      BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE item_complemento (
  id                SERIAL PRIMARY KEY,
  id_item           INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  nome              VARCHAR(120) NOT NULL,
  preco_adicional   NUMERIC(10,2) NOT NULL DEFAULT 0,
  disponivel        BOOLEAN NOT NULL DEFAULT true
);

-- recebido -> preparando -> saiu_entrega -> entregue (ou cancelado)
CREATE TABLE pedido (
  id                SERIAL PRIMARY KEY,
  id_loja           INTEGER NOT NULL REFERENCES loja(id),
  cliente_nome      VARCHAR(120) NOT NULL,
  cliente_telefone  VARCHAR(20) NOT NULL,
  endereco_texto    TEXT NOT NULL,
  forma_pagamento   VARCHAR(30) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'recebido',
  total             NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes       TEXT,
  criado_em         TIMESTAMP NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT pedido_status_check CHECK (status IN ('recebido','preparando','saiu_entrega','entregue','cancelado'))
);

CREATE TABLE pedido_item (
  id                SERIAL PRIMARY KEY,
  id_pedido         INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  id_item           INTEGER NOT NULL REFERENCES item(id),
  quantidade        INTEGER NOT NULL DEFAULT 1,
  preco_unitario    NUMERIC(10,2) NOT NULL,
  observacao        VARCHAR(300)
);

CREATE TABLE pedido_item_complemento (
  id                    SERIAL PRIMARY KEY,
  id_pedido_item        INTEGER NOT NULL REFERENCES pedido_item(id) ON DELETE CASCADE,
  id_item_complemento   INTEGER NOT NULL REFERENCES item_complemento(id),
  preco_adicional       NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE pedido_status_historico (
  id            SERIAL PRIMARY KEY,
  id_pedido     INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL,
  criado_em     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_categoria_loja ON categoria(id_loja);
CREATE INDEX idx_item_categoria ON item(id_categoria);
CREATE INDEX idx_pedido_loja_status ON pedido(id_loja, status);
CREATE INDEX idx_pedido_item_pedido ON pedido_item(id_pedido);
