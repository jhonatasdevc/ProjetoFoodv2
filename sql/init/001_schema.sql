-- Schema do delivery — v2.
-- v1 (MVP): sem login de cliente, endereço em texto livre, pagamento mock, login da
-- loja é usuário/senha simples (uma credencial por loja, não multi-usuário).
-- v2: adiciona login de cliente por celular (OTP mockado nesta versão — sem gateway
-- de SMS real), endereços estruturados e múltiplos por cliente, cupom de desconto,
-- grupos de restaurante por tipo de comida, e painel admin (cadastra loja/grupo).
-- Checkout passa a exigir cliente logado.

-- Upload de imagens (foto de capa da loja, foto de produto) guardado direto no banco —
-- servido via GET /api/uploads/:id. Sem storage externo nesta versão.
CREATE TABLE imagem (
  id              SERIAL PRIMARY KEY,
  dados           BYTEA NOT NULL,
  tipo            VARCHAR(100) NOT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE grupo (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(80) NOT NULL,
  ordem           INTEGER NOT NULL DEFAULT 0,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE admin (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  senha_hash      VARCHAR(200) NOT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

-- ativo = "desbloqueada": lojas nascem bloqueadas (invisíveis pro cliente) até o próprio
-- lojista completar nome, foto de capa, foto de perfil e configurar o frete (rota
-- PATCH /loja/me valida esses requisitos antes de aceitar ativo=true).
CREATE TABLE loja (
  id                 SERIAL PRIMARY KEY,
  id_grupo           INTEGER NOT NULL REFERENCES grupo(id),
  nome               VARCHAR(120) NOT NULL,
  email              VARCHAR(160) NOT NULL UNIQUE,
  senha_hash         VARCHAR(200) NOT NULL,
  telefone           VARCHAR(20),
  endereco           VARCHAR(200),
  imagem_url         VARCHAR(300),
  imagem_perfil_url  VARCHAR(300),
  -- aceita_entrega/aceita_retirada não são exclusivos — a loja pode oferecer os dois ao
  -- mesmo tempo, e o cliente escolhe no checkout. tipo_frete só é usado quando
  -- aceita_entrega=true (define se a entrega é grátis ou cobra valor_frete).
  aceita_entrega     BOOLEAN NOT NULL DEFAULT true,
  tipo_frete         VARCHAR(20) NOT NULL DEFAULT 'pago',
  valor_frete        NUMERIC(10,2),
  aceita_retirada    BOOLEAN NOT NULL DEFAULT false,
  ativo              BOOLEAN NOT NULL DEFAULT false,
  criado_em          TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT loja_tipo_frete_check CHECK (tipo_frete IN ('gratis','pago')),
  CONSTRAINT loja_aceita_algo_check CHECK (aceita_entrega OR aceita_retirada)
);

-- Uma linha por dia da semana (0=domingo .. 6=sábado) por loja. "fechado=true" ignora
-- abre_em/fecha_em. Sem linha pro dia = loja não configurou esse dia (tratado como fechado).
-- abre_em/fecha_em em formato "HH:MM" (texto simples, sem TIME nativo do Postgres —
-- mais fácil de manipular no client e no formulário do que lidar com timezone/data
-- fantasma que o driver anexa a colunas TIME).
CREATE TABLE horario_funcionamento (
  id              SERIAL PRIMARY KEY,
  id_loja         INTEGER NOT NULL REFERENCES loja(id) ON DELETE CASCADE,
  dia_semana      SMALLINT NOT NULL,
  abre_em         VARCHAR(5),
  fecha_em        VARCHAR(5),
  fechado         BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT horario_funcionamento_loja_dia_unique UNIQUE (id_loja, dia_semana),
  CONSTRAINT horario_funcionamento_dia_check CHECK (dia_semana BETWEEN 0 AND 6)
);

-- Fechamento temporário (férias, manutenção etc.) — enquanto "agora" estiver entre
-- inicio e fim, a loja aparece fechada pro cliente independente do horário semanal.
CREATE TABLE fechamento_temporario (
  id              SERIAL PRIMARY KEY,
  id_loja         INTEGER NOT NULL REFERENCES loja(id) ON DELETE CASCADE,
  inicio          TIMESTAMP NOT NULL,
  fim             TIMESTAMP NOT NULL,
  motivo          VARCHAR(200),
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_horario_funcionamento_loja ON horario_funcionamento(id_loja);
CREATE INDEX idx_fechamento_temporario_loja ON fechamento_temporario(id_loja);

-- Story some sozinho das consultas 24h depois de criado (filtro por criado_em nas rotas).
CREATE TABLE story (
  id              SERIAL PRIMARY KEY,
  id_loja         INTEGER NOT NULL REFERENCES loja(id) ON DELETE CASCADE,
  imagem_url      VARCHAR(300) NOT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_story_loja ON story(id_loja);
CREATE INDEX idx_story_criado_em ON story(criado_em);

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
  preco_promocional NUMERIC(10,2),
  imagem_url      VARCHAR(300),
  disponivel      BOOLEAN NOT NULL DEFAULT true,
  -- Máx. 3 por loja em destaque, mostrados numa seção separada pro cliente — validado na
  -- API (contagem entre itens de todas as categorias da loja), não dá pra expressar isso
  -- num CHECK simples do Postgres.
  destaque        BOOLEAN NOT NULL DEFAULT false,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE item_complemento (
  id                SERIAL PRIMARY KEY,
  id_item           INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  nome              VARCHAR(120) NOT NULL,
  preco_adicional   NUMERIC(10,2) NOT NULL DEFAULT 0,
  disponivel        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE usuario (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(80) NOT NULL,
  sobrenome       VARCHAR(80) NOT NULL,
  telefone        VARCHAR(20) NOT NULL UNIQUE,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE endereco (
  id              SERIAL PRIMARY KEY,
  id_usuario      INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  cep             VARCHAR(10) NOT NULL,
  cidade          VARCHAR(80) NOT NULL,
  estado          VARCHAR(2) NOT NULL,
  rua             VARCHAR(160) NOT NULL,
  numero          VARCHAR(20) NOT NULL,
  complemento     VARCHAR(80),
  referencia      VARCHAR(160),
  padrao          BOOLEAN NOT NULL DEFAULT false,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE favorito (
  id              SERIAL PRIMARY KEY,
  id_usuario      INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_loja         INTEGER NOT NULL REFERENCES loja(id) ON DELETE CASCADE,
  criado_em       TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT favorito_usuario_loja_unique UNIQUE (id_usuario, id_loja)
);

CREATE INDEX idx_favorito_usuario ON favorito(id_usuario);

-- Inscrição de push notification (Web Push) do navegador do cliente. Um usuário pode ter
-- várias (um por navegador/dispositivo onde ativou notificações).
CREATE TABLE push_subscription (
  id              SERIAL PRIMARY KEY,
  id_usuario      INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL UNIQUE,
  chave_p256dh    VARCHAR(200) NOT NULL,
  chave_auth      VARCHAR(200) NOT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscription_usuario ON push_subscription(id_usuario);

-- Código de verificação por celular (OTP). Nesta versão o código é mockado:
-- retornado na própria resposta da API em vez de enviado por SMS de verdade.
CREATE TABLE otp_codigo (
  id              SERIAL PRIMARY KEY,
  telefone        VARCHAR(20) NOT NULL,
  codigo          VARCHAR(6) NOT NULL,
  expira_em       TIMESTAMP NOT NULL,
  usado           BOOLEAN NOT NULL DEFAULT false,
  criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE cupom (
  id                SERIAL PRIMARY KEY,
  codigo            VARCHAR(30) NOT NULL UNIQUE,
  tipo_desconto     VARCHAR(20) NOT NULL, -- 'percentual' | 'valor_fixo'
  valor_desconto    NUMERIC(10,2) NOT NULL,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  valido_ate        TIMESTAMP,
  criado_em         TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT cupom_tipo_check CHECK (tipo_desconto IN ('percentual','valor_fixo'))
);

-- recebido -> preparando -> saiu_entrega -> entregue (ou cancelado)
-- cliente_nome/cliente_telefone/endereco_texto são snapshot derivado no servidor
-- a partir do usuário/endereço autenticado no momento do pedido (não input livre).
CREATE TABLE pedido (
  id                SERIAL PRIMARY KEY,
  id_loja           INTEGER NOT NULL REFERENCES loja(id),
  id_usuario        INTEGER NOT NULL REFERENCES usuario(id),
  id_endereco       INTEGER REFERENCES endereco(id) ON DELETE SET NULL,
  id_cupom          INTEGER REFERENCES cupom(id) ON DELETE SET NULL,
  cliente_nome      VARCHAR(120) NOT NULL,
  cliente_telefone  VARCHAR(20) NOT NULL,
  endereco_texto    TEXT NOT NULL,
  forma_pagamento   VARCHAR(30) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'recebido',
  total             NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_desconto    NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_frete       NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- o que o CLIENTE escolheu nesse pedido (entrega ou retirada) — não é o mesmo campo
  -- que a config da loja, já que a loja pode aceitar os dois modos ao mesmo tempo.
  tipo_entrega      VARCHAR(20) NOT NULL DEFAULT 'entrega',
  observacoes       TEXT,
  criado_em         TIMESTAMP NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT pedido_status_check CHECK (status IN ('recebido','preparando','saiu_entrega','entregue','cancelado')),
  CONSTRAINT pedido_tipo_entrega_check CHECK (tipo_entrega IN ('entrega','retirada'))
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

CREATE INDEX idx_loja_grupo ON loja(id_grupo);
CREATE INDEX idx_categoria_loja ON categoria(id_loja);
CREATE INDEX idx_item_categoria ON item(id_categoria);
CREATE INDEX idx_endereco_usuario ON endereco(id_usuario);
CREATE INDEX idx_otp_telefone ON otp_codigo(telefone);
CREATE INDEX idx_pedido_loja_status ON pedido(id_loja, status);
CREATE INDEX idx_pedido_usuario ON pedido(id_usuario);
CREATE INDEX idx_pedido_item_pedido ON pedido_item(id_pedido);
