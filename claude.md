Projeto: App de Delivery — Loja + Cliente
Visão geral

Sistema de delivery com 2 frontends separados por subdomínio, compartilhando a mesma API/backend e o mesmo banco de dados:

cores: predominante vermelho e detalhes em verde, fundo branco
loja.minhaempresa.com.br → painel para a loja acompanhar e gerenciar pedidos em tempo real
pedidos.minhaempresa.com.br → site do cliente: acessa a loja (via NFC/URL /loja/{id}), monta o pedido, escolhe endereço, paga
api.minhaempresa.com.br (ou mesma origem com /api) → backend único que serve os dois
Arquitetura sugerida (monorepo)
/delivery-app
├── docker-compose.yml       # Postgres + Adminer (dev local)
├── .env
├── /apps
│   ├── /api                 # backend (Node/Express ou Fastify) — fonte única de verdade
│   ├── /web-loja             # frontend do painel da loja (subdomínio loja.)
│   └── /web-cliente          # frontend do cliente (subdomínio pedidos.)
├── /sql
│   └── /init                 # scripts .sql de criação de tabelas (rodam no 1º start do container)
└── /packages
    └── /shared                # tipos/DTOs compartilhados entre api e os 2 frontends

Justificativa: um backend só evita duplicar regra de negócio (cálculo de total, status do pedido, etc). Os dois frontends conversam com a mesma API, cada um só expõe as telas relevantes pro seu público.

Banco de dados

Postgres rodando via docker-compose.yml na raiz do projeto. Suba com:

bash
docker compose up -d
Host: localhost:5432 (ver .env para user/senha/db)
Adminer disponível em http://localhost:8081 pra inspecionar tabelas visualmente
Scripts de criação de schema devem ficar em /sql/init/*.sql — rodam automaticamente na primeira subida do volume. Se precisar recriar do zero: docker compose down -v && docker compose up -d
Schema (ver detalhamento completo em estrutura-delivery.md)

Tabelas principais: USUARIO, ENDERECO, FORMA_PAGAMENTO, LOJA, CATEGORIA, ITEM, ITEM_COMPLEMENTO, PEDIDO, PEDIDO_ITEM, PEDIDO_ITEM_COMPLEMENTO, PEDIDO_STATUS_HISTORICO.

Regra crítica: nunca armazenar dado de cartão cru — só token de gateway (Mercado Pago).

Fluxo do cliente (web-cliente)
Acessa /loja/{id} (via tag NFC ou link direto)
Vê cardápio (categorias + itens)
Adiciona itens ao carrinho (com complementos, se houver)
Escolhe/cadastra endereço
Escolhe/cadastra forma de pagamento (token via SDK do gateway)
Confirma pedido → PEDIDO criado com status recebido
Fluxo da loja (web-loja)
Login (por loja, não por usuário-cliente)
Lista de pedidos em tempo real, filtrados por status
Ação de avançar status (recebido → preparando → saiu_entrega → entregue)
Idealmente com notificação sonora/push quando um pedido novo chega
CRUD de cardápio (categorias, itens, disponibilidade)
Tempo real

Pedidos precisam aparecer no painel da loja sem refresh manual. Sugestão: WebSocket (Socket.io) ou Server-Sent Events entre api e web-loja. Alternativa mais simples pro MVP: polling a cada poucos segundos.

O que construir primeiro (ordem sugerida)
Subir o banco com Docker e rodar as migrations/scripts do schema fica em estrutura_banco.md
API: CRUD de LOJA, CATEGORIA, ITEM (sem isso não tem cardápio pra mostrar)
API: fluxo de PEDIDO (criar, adicionar item, fechar pedido)
web-cliente: tela de loja + carrinho + checkout (endereço e pagamento podem ser simplificados no início — endereço em texto livre, pagamento mock)
web-loja: lista de pedidos + mudança de status
Integrar pagamento real (Mercado Pago) e notificação via WhatsApp (Evolution API) pra loja
Decisões ainda em aberto (perguntar antes de assumir)
Carrinho é uma linha de PEDIDO com status carrinho, ou fica só no estado do frontend até a confirmação?
Autenticação do cliente: telefone + OTP, ou email/senha?
Login da loja: usuário/senha simples por enquanto, ou já pensar em multi-usuário por loja?
Vai ter entregador próprio (precisa de tabela ENTREGADOR) ou é a loja que entrega?