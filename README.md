# Delivery App — MVP

App de delivery com 2 frontends (painel da loja + site do cliente) compartilhando a mesma API e banco de dados. Ver visão geral e decisões de produto em [claude.md](./claude.md).

## Estrutura

```
/apps
  /api          → backend Fastify + Prisma + Socket.io (porta 3333)
  /web-loja     → painel da loja em Next.js (porta 3001)
  /web-cliente  → site do cliente em Next.js (porta 3002)
/packages
  /shared       → tipos TypeScript compartilhados entre api e os 2 frontends
/sql/init       → schema.sql + seed.sql — rodam automaticamente na 1ª subida do Postgres
```

## Decisões do MVP

- Sem login de cliente: checkout com nome/telefone em texto livre, endereço em texto livre, pagamento mock (sem gateway real ainda).
- Login da loja: usuário/senha simples (uma credencial por loja).
- Sem tabela de entregador — pedido só avança de status.
- Carrinho vive no estado do frontend (localStorage não persistido entre sessões no MVP), só vira PEDIDO no banco na confirmação do checkout.

## Rodando localmente

### 1. Banco de dados

```bash
docker compose up -d
```

- Postgres em `localhost:5432` (schema e seed em `/sql/init` rodam automaticamente na 1ª subida)
- Adminer em http://localhost:8081 (sistema: PostgreSQL, servidor: `db`, usuário/senha/banco conforme `.env`)
- Pra recriar o banco do zero: `docker compose down -v && docker compose up -d`

### 2. Instalar dependências (raiz do monorepo)

```bash
npm install
```

### 3. Subir API + os 2 frontends

```bash
npm run dev
```

Isso roda em paralelo:
- API: http://localhost:3333
- web-loja: http://localhost:3001
- web-cliente: http://localhost:3002

Ou rode cada um separado: `npm run dev:api`, `npm run dev:web-loja`, `npm run dev:web-cliente`.

### 4. Testar o fluxo

- Loja de teste (seed): login em http://localhost:3001/login com `ze@pizzaria.com` / `senha123`
- Cardápio do cliente: http://localhost:3002/loja/1
- Monte um pedido no site do cliente → ele aparece em tempo real no painel da loja (aba "Recebido") com um beep
- Avance o status do pedido no painel → o cliente vê a atualização na tela de acompanhamento (`/pedido/{id}`)

## Scripts úteis

- `npm run db:up` / `npm run db:down` / `npm run db:reset`
- `npm run seed:loja --workspace=apps/api -- email@loja.com novaSenha` — troca a senha de uma loja existente

## O que falta (próximos passos, ver claude.md)

- Pagamento real via Mercado Pago (hoje é só um select mock de forma de pagamento)
- Notificação via WhatsApp (Evolution API) pra loja
- Multi-usuário por loja / autenticação real do cliente, se decidirem evoluir pra isso
