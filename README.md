# Asaas Payment Lab

Laboratório para estudar, testar e compreender integração com a **API Asaas Sandbox**. Finalidade educacional e homologação — **não utiliza dinheiro real**.

Este repositório é um **laboratório isolado**. O sistema real de aluguel de motos reutilizará padrões daqui, mas com domínio, auth e deploy próprios. Veja o mapeamento em [`docs/ASAAS_MASTER_GUIDE.md`](docs/ASAAS_MASTER_GUIDE.md#9--projeto-de-aluguel).

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TanStack Query |
| Backend | NestJS 11, Fastify, Prisma, PostgreSQL, JWT, Swagger |
| Shared | Enums, schemas Zod, `PaymentProvider`, mappers |
| Infra local | Docker Compose, npm workspaces |

```text
/
├── apps/web/          # Dashboard Next.js
├── apps/api/          # API NestJS
├── packages/shared/   # Contratos compartilhados
└── docker-compose.yml
```

## Como executar

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

API e web sobem juntos. Porta padrão da API: **4000** (`API_PORT` no `.env`). Se `PORT` estiver definido (ex.: Vercel), ele tem prioridade.

## URLs locais

| Recurso | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/docs |
| Health geral | http://localhost:4000/health |
| Health banco | http://localhost:4000/health/database |
| Health Asaas | http://localhost:4000/health/asaas |
| Webhook | POST http://localhost:4000/webhooks/asaas |

## Credenciais locais

| Papel | E-mail | Senha |
|-------|--------|-------|
| ADMIN | admin@lab.local | Lab@123456 |
| VIEWER | viewer@lab.local | Lab@123456 |

Dados do seed são fictícios. IDs Asaas no seed (`cus_seed_001`, etc.) são placeholders — integração real exige API Key Sandbox.

## Variáveis de ambiente

Somente nomes e funções — **nunca commite secrets reais**.

| Variável | Função |
|----------|--------|
| `DATABASE_URL` | Conexão PostgreSQL |
| `API_PORT` / `PORT` | Porta da API (local / Vercel) |
| `API_URL` | URL base da API |
| `WEB_URL` | Origem CORS e URLs de callback do Checkout |
| `JWT_SECRET` | Assinatura dos tokens |
| `JWT_EXPIRES_IN` | Validade do JWT |
| `PAYMENT_PROVIDER` | `asaas` (padrão) ou `mock` (testes) |
| `ASAAS_ENV` | Ambiente (`sandbox`) |
| `ASAAS_API_URL` | Base da API Asaas |
| `ASAAS_API_KEY` | Chave Sandbox (`$aact_hmlg_...`) |
| `ASAAS_WEBHOOK_AUTH_TOKEN` | Token validado no header `asaas-access-token` |
| `ASAAS_WEBHOOK_URL` | URL pública do webhook (ngrok / deploy) |
| `LOG_LEVEL` | Nível de log |

## Sandbox Asaas

1. Conta em [sandbox.asaas.com](https://sandbox.asaas.com)
2. API Key em Integrações → preencher `ASAAS_API_KEY`
3. Token forte em `ASAAS_WEBHOOK_AUTH_TOKEN`
4. Expor API via HTTPS (ngrok, Cloudflare Tunnel, deploy)
5. Cadastrar webhook: `POST https://sua-url/webhooks/asaas`
6. Header: `asaas-access-token: SEU_TOKEN`
7. Selecionar eventos de pagamento, assinatura e checkout

Documentação oficial: [docs.asaas.com](https://docs.asaas.com)

## Funcionalidades

| Área | Rotas principais |
|------|------------------|
| Customers | `POST /customers`, `POST /customers/:id/sync` |
| Produtos | `GET/POST/PATCH /products` |
| PIX único | `POST /payment-orders/pix` |
| Cartão único | `POST /payment-orders/credit-card` |
| Assinatura | `POST /subscriptions/monthly` |
| Checkouts | `GET /checkouts`, `POST /checkouts/:id/reconcile` |
| Pagamentos | `GET /payments`, `POST /payments/:id/reconcile`, `POST /payments/:id/refund` |
| Assinatura lifecycle | `POST /subscriptions/:id/pause|resume|cancel` |
| Webhooks | `POST /webhooks/asaas` (público, token) |
| Reconciliação | `POST /admin/reconciliation/run` |
| Roles | ADMIN (escrita) / VIEWER (somente leitura) |

**Regras fixas do lab:** Checkout hospedado (cartão nunca passa pelo sistema); confirmação financeira via webhook ou reconciliação, **não** via callback de success; fila de webhooks em PostgreSQL (sem Redis).

## Páginas do frontend

`/login` · `/dashboard` · `/customers` · `/products` · `/checkout/new` · `/checkouts` · `/payments` · `/subscriptions` · `/webhooks` · `/audit` · `/settings` · `/sandbox` (ADMIN)

Callbacks de UX: `/checkout/success|pending|canceled|error`

## Produtos seed

| Produto | Tipo | Valor |
|---------|------|-------|
| Pagamento PIX de teste | ONE_TIME | R$ 15,00 |
| Pagamento com cartão | ONE_TIME | R$ 25,00 |
| Plano mensal básico | SUBSCRIPTION | R$ 39,90 |
| Plano mensal profissional | SUBSCRIPTION | R$ 79,90 |

Parcelamento: **não suportado** (Checkout hospedado sem `installmentCount`).

## Scripts

```bash
npm run dev          # API + Web
npm run dev:api      # Somente API
npm run dev:web      # Somente Web
npm run build        # Build completo
npm run lint         # Typecheck
npm run typecheck    # Idem
npm run test         # Unitários (shared + api)
npm run test:e2e     # E2E (health + webhook auth)
npm run prisma:studio
```

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [`docs/ASAAS_MASTER_GUIDE.md`](docs/ASAAS_MASTER_GUIDE.md) | Arquitetura, conceitos, regras, adaptação ao aluguel |
| [`docs/ASAAS_TEST_CHECKLIST.md`](docs/ASAAS_TEST_CHECKLIST.md) | Roteiro de testes no Sandbox |

## Estado atual

Classificação honesta com base no código — **homologação Sandbox ainda não documentada no repositório**.

| Fluxo | Código | Testes auto | Sandbox |
|-------|--------|-------------|---------|
| Customers + sync | Implementado | Sem cobertura financeira | Pendente |
| PIX / cartão único | Implementado | Mock parcial | Pendente |
| Assinatura + lifecycle | Implementado | Mock parcial | Pendente |
| Webhooks (persist → fila → worker) | Implementado | Token e2e | Pendente |
| Reconciliação | Implementado | Sem cobertura | Pendente |
| Estorno | Implementado (`POST /payments/:id/refund`) | Sem cobertura | Pendente |
| Rate limiting | Não implementado | — | — |
| Cron em serverless | Frágil na Vercel | — | Deploy persistente recomendado |

**Limitações conhecidas:** somente Sandbox; sem split, subcontas, antecipação ou emissão fiscal; cron de webhook/reconciliação precisa de processo persistente (Render, Railway, Fly.io).

## Deploy da API

Root Directory na Vercel: `apps/api`. Monorepo exige **Include source files outside of the Root Directory**. Migrations Prisma **não** rodam no deploy — execute `npx prisma migrate deploy` manualmente.

Para webhook e reconciliação confiáveis, prefira servidor persistente em vez de serverless puro. Detalhes de deploy ficam fora do escopo deste README — consulte [`docs/ASAAS_MASTER_GUIDE.md`](docs/ASAAS_MASTER_GUIDE.md) seção de confiabilidade.
