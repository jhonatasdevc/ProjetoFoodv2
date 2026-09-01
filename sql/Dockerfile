# syntax=docker/dockerfile:1.7
FROM postgres:16-alpine

# O conteúdo dos scripts fica embutido direto no Dockerfile (heredoc) em vez de
# vir de COPY sql/init/ — em builds anteriores, plataformas de deploy via git
# (Hostinger) às vezes não traziam esses arquivos extras no contexto de build
# num rebuild, mesmo com o arquivo tracked no git e presente na 1ª instalação.
# O texto do próprio Dockerfile sempre chega certo, então botar o SQL aqui
# elimina essa classe de erro por completo.

COPY <<'SQL' /docker-entrypoint-initdb.d/001_schema.sql
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
  ordem           INTEGER NOT NULL DEFAULT 0,
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

-- Chat do pedido — só fica acessível pra enviar mensagem enquanto o pedido está em
-- andamento (recebido/preparando/saiu_entrega), validado na API, não aqui.
CREATE TABLE pedido_mensagem (
  id            SERIAL PRIMARY KEY,
  id_pedido     INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  remetente     VARCHAR(10) NOT NULL,
  texto         TEXT NOT NULL,
  criado_em     TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT pedido_mensagem_remetente_check CHECK (remetente IN ('cliente','loja'))
);

CREATE INDEX idx_pedido_mensagem_pedido ON pedido_mensagem(id_pedido);
CREATE INDEX idx_loja_grupo ON loja(id_grupo);
CREATE INDEX idx_categoria_loja ON categoria(id_loja);
CREATE INDEX idx_item_categoria ON item(id_categoria);
CREATE INDEX idx_endereco_usuario ON endereco(id_usuario);
CREATE INDEX idx_otp_telefone ON otp_codigo(telefone);
CREATE INDEX idx_pedido_loja_status ON pedido(id_loja, status);
CREATE INDEX idx_pedido_usuario ON pedido(id_usuario);
CREATE INDEX idx_pedido_item_pedido ON pedido_item(id_pedido);
SQL

COPY <<'SQL' /docker-entrypoint-initdb.d/002_seed.sql
-- Dados de exemplo pra testar localmente.
-- Senha de todas as lojas de teste: "senha123" — gerado com bcrypt.hashSync('senha123', 10)
-- Senha do admin de teste: "admin123" — gerado com bcrypt.hashSync('admin123', 10)

INSERT INTO grupo (nome, ordem) VALUES
  ('Pizza', 1),
  ('Hambúrguer', 2),
  ('Japonesa', 3),
  ('Doces', 4),
  ('Brasileira', 5),
  ('Saudável', 6);

INSERT INTO admin (nome, email, senha_hash) VALUES
  ('Admin', 'admin@delivery.com', '$2a$10$oAAUzztSy6.SFN03tNHJFuVzeHMmeYAxxMHzqzeYl13KWS1syKY9W');

-- Lojas de exemplo já nascem desbloqueadas (ativo=true) e com frete configurado — só as
-- lojas cadastradas pelo admin de verdade nascem bloqueadas (default da coluna).
INSERT INTO loja (id_grupo, nome, email, senha_hash, telefone, endereco, imagem_url, imagem_perfil_url, aceita_entrega, tipo_frete, valor_frete, aceita_retirada, ativo) VALUES
  (1, 'Pizzaria do Zé', 'ze@pizzaria.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11999998888', 'Rua das Pizzas, 100', 'https://picsum.photos/seed/pizzaria-do-ze/480/600', 'https://picsum.photos/seed/pizzaria-do-ze-perfil/200/200', true, 'pago', 6.00, false, true),
  (2, 'Burger House', 'contato@burgerhouse.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11988887777', 'Av. dos Hambúrgueres, 200', 'https://picsum.photos/seed/burger-house/480/600', 'https://picsum.photos/seed/burger-house-perfil/200/200', true, 'gratis', null, true, true),
  (3, 'Sushi Kazu', 'contato@sushikazu.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11977776666', 'Rua Japão, 300', 'https://picsum.photos/seed/sushi-kazu/480/600', 'https://picsum.photos/seed/sushi-kazu-perfil/200/200', true, 'pago', 9.90, false, true),
  (4, 'Doce Sonho', 'contato@docesonho.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11966665555', 'Rua das Sobremesas, 400', 'https://picsum.photos/seed/doce-sonho/480/600', 'https://picsum.photos/seed/doce-sonho-perfil/200/200', false, 'pago', null, true, true),
  (5, 'Sabor Caseiro', 'contato@saborcaseiro.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11955554444', 'Rua do Brasil, 500', 'https://picsum.photos/seed/sabor-caseiro/480/600', 'https://picsum.photos/seed/sabor-caseiro-perfil/200/200', true, 'pago', 5.50, false, true),
  (6, 'Verde Vida', 'contato@verdevida.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11944443333', 'Alameda Saudável, 600', 'https://picsum.photos/seed/verde-vida/480/600', 'https://picsum.photos/seed/verde-vida-perfil/200/200', true, 'gratis', null, false, true);

-- Lojas de exemplo abertas todo santo dia, 24h — só pra não bloquear pedido nas demos
-- dependendo da hora que alguém for testar. Loja de verdade configura isso em /horarios.
INSERT INTO horario_funcionamento (id_loja, dia_semana, abre_em, fecha_em, fechado)
SELECT loja.id, dia.n, '00:00', '23:59', false
FROM loja
CROSS JOIN generate_series(0, 6) AS dia(n);

INSERT INTO categoria (id_loja, nome, ordem) VALUES
  (1, 'Pizzas', 1),
  (1, 'Bebidas', 2),
  (2, 'Lanches', 1),
  (3, 'Combinados', 1),
  (4, 'Doces', 1),
  (5, 'Pratos', 1),
  (6, 'Saladas', 1);

INSERT INTO item (id_categoria, nome, descricao, preco) VALUES
  (1, 'Pizza Margherita', 'Molho de tomate, mussarela e manjericão', 42.90),
  (1, 'Pizza Calabresa', 'Molho de tomate, mussarela e calabresa', 39.90),
  (2, 'Refrigerante Lata', 'Coca-Cola, Guaraná ou Fanta', 6.00),
  (3, 'X-Burger', 'Pão, hambúrguer, queijo, alface e tomate', 24.90),
  (3, 'X-Bacon', 'Pão, hambúrguer, queijo, bacon e molho especial', 28.90),
  (4, 'Combo 20 peças', 'Sushis e sashimis variados', 49.90),
  (4, 'Temaki Salmão', 'Temaki de salmão fresco', 22.90),
  (5, 'Brownie', 'Brownie de chocolate com nozes', 12.90),
  (5, 'Pudim', 'Pudim de leite condensado', 9.90),
  (6, 'Feijoada', 'Feijoada completa com acompanhamentos', 32.90),
  (6, 'Frango com Quiabo', 'Frango caipira com quiabo e polenta', 28.90),
  (7, 'Salada Caesar', 'Alface, frango grelhado, croutons e parmesão', 24.90),
  (7, 'Bowl Vegano', 'Grãos, legumes e molho tahine', 26.90);

INSERT INTO item_complemento (id_item, nome, preco_adicional) VALUES
  (1, 'Borda recheada catupiry', 8.00),
  (2, 'Borda recheada catupiry', 8.00);

INSERT INTO cupom (codigo, tipo_desconto, valor_desconto) VALUES
  ('BEMVINDO10', 'percentual', 10);
SQL
