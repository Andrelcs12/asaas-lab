# Asaas Payment Lab

Laboratório completo para estudar, testar e compreender os principais fluxos da API do **Asaas Sandbox**.

> Finalidade educacional e de homologação. Não utiliza dinheiro real.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TanStack Query, React Hook Form, Zod, Sonner |
| Backend | NestJS 11, Fastify, Prisma, PostgreSQL, JWT, Swagger |
| Shared | Enums, schemas Zod, tipos e utilitários compartilhados |
| Infra | Docker Compose, npm workspaces |

## Estrutura

```text
/
├── apps/
│   ├── web/          # Dashboard Next.js
│   └── api/          # API NestJS
├── packages/
│   └── shared/       # Contratos compartilhados
├── docker-compose.yml
└── package.json
```

## Instalação

```bash
# 1. Clonar e instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# Edite .env com JWT_SECRET e credenciais Asaas Sandbox

# 3. Subir PostgreSQL
docker compose up -d

# 4. Banco de dados
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 5. Desenvolvimento (API :4000 + Web :3000)
npm run dev
```

### Credenciais seed (locais)

| Usuário | E-mail | Senha | Papel |
|---------|--------|-------|-------|
| Admin | admin@lab.local | Lab@123456 | ADMIN |
| Viewer | viewer@lab.local | Lab@123456 | VIEWER |

**Nota:** Dados do seed são fictícios e não representam integração real com o Asaas.

## Configuração manual do Asaas Sandbox

1. Crie conta em [Sandbox Asaas](https://sandbox.asaas.com)
2. Gere API Key em Integrações → chave com prefixo `$aact_hmlg_`
3. Preencha no `.env`:
   - `ASAAS_API_KEY=sua-chave`
   - `ASAAS_WEBHOOK_AUTH_TOKEN=token-forte-aleatorio`
4. Exponha a API local via HTTPS (ngrok, Cloudflare Tunnel, etc.)
5. Cadastre webhook: `POST https://sua-url/webhooks/asaas`
6. Header de autenticação: `asaas-access-token: SEU_TOKEN`
7. Selecione eventos de pagamento, assinatura e checkout
8. Teste PIX, cartão e assinatura com dados oficiais do Sandbox

Documentação: [docs.asaas.com](https://docs.asaas.com)

## Conceitos

| Conceito | Descrição |
|----------|-----------|
| **Customer** | Cliente local sincronizado com `/v3/customers` |
| **Product** | Catálogo de produtos para simulação (ONE_TIME / SUBSCRIPTION) |
| **Checkout** | Entidade local vinculada ao Checkout hospedado do Asaas |
| **Payment** | Cobrança confirmada (via webhook/reconciliação) |
| **Subscription** | Recorrência mensal controlada pelo Asaas |
| **Checkout** | Página hospedada — `POST /v3/checkouts` |
| **Webhook** | Notificação assíncrona (at-least-once) |
| **externalReference** | Vínculo entre sistemas (`payment_order_{uuid}`) |
| **Idempotência** | Chave em ordens + ID único em webhooks |
| **Reconciliação** | Compara estado local vs remoto |

### Confirmado vs Recebido

- **CONFIRMED**: pagamento concluído, fundos ainda não disponíveis
- **RECEIVED**: fundos disponíveis (prazo varia por método)

### Pausa vs Cancelamento

- **Pausa**: `PUT /subscriptions/{id}` com `status: INACTIVE` — mapeado internamente como `PAUSED`
- **Cancelamento**: `DELETE /subscriptions/{id}` — definitivo, preserva histórico

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login JWT |
| GET | `/admin/dashboard` | Métricas |
| POST | `/customers` | Criar cliente |
| POST | `/customers/:id/sync` | Sincronizar com Asaas |
| POST | `/payment-orders/pix` | Checkout PIX (com productId) |
| POST | `/payment-orders/credit-card` | Checkout cartão |
| POST | `/subscriptions/monthly` | Assinatura mensal |
| GET | `/products` | Listar produtos |
| GET | `/checkouts` | Listar checkouts |
| POST | `/webhooks/asaas` | Receber webhooks |
| POST | `/admin/reconciliation/run` | Reconciliação manual |
| GET | `/docs` | Swagger OpenAPI |

## Scripts

```bash
npm run dev          # API + Web
npm run dev:api      # Somente API
npm run dev:web      # Somente Web
npm run build        # Build completo
npm run lint         # Typecheck/lint
npm run test         # Testes unitários
npm run prisma:studio
```

## Decisões importantes

1. **Checkout hospedado obrigatório** — nunca capturamos cartão localmente
2. **Pausa = INACTIVE** — conforme documentação oficial Asaas
3. **Fila de webhooks em PostgreSQL** — sem Redis nesta versão
4. **MockPaymentProvider** — apenas testes (`PAYMENT_PROVIDER=mock`)
5. **Cron local** — só para webhooks e reconciliação, não cria cobranças

## Limitações

- Somente Sandbox
- Sem split, subcontas, antecipação, transferência, emissão fiscal
- Integração externa real depende de API Key configurada manualmente
- Callback de Checkout não confirma pagamento — aguardar webhook

## Páginas do frontend (legado — ver seção atualizada acima)

- `/payments/new` redireciona conceitualmente para `/checkout/new`

## Deploy do backend na Vercel

> **Root Directory na Vercel:** `apps/api`  
> **Framework:** NestJS (via `apps/api/vercel.json`)  
> **Sem prefixo global** — rotas públicas: `GET /health` e `POST /webhooks/asaas`

### Passo a passo

1. Faça push do repositório para o GitHub.
2. Abra [vercel.com/new](https://vercel.com/new) e importe o repositório.
3. Em **Root Directory**, selecione `apps/api`.
4. Em **Project Settings → General**, ative **Include source files outside of the Root Directory in the Build Step** (obrigatório para o monorepo `@asaas-lab/shared`).
5. Em **Build & Development Settings**, confirme:
   - **Framework Preset:** NestJS (ou deixe o `vercel.json` sobrescrever)
   - **Output Directory:** vazio / padrão — **não** use `public`
   - **Install Command** e **Build Command:** deixe o `apps/api/vercel.json` controlar
6. Confirme que o framework **NestJS** foi detectado (não "Other").
7. Adicione as variáveis de ambiente:

```env
NODE_ENV=production
ASAAS_ENV=sandbox
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=valor_sandbox
ASAAS_WEBHOOK_AUTH_TOKEN=token_gerado_no_painel
```

8. Para uso completo (auth, dashboard, Prisma), adicione também:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=valor-seguro-aleatorio
WEB_URL=https://seu-frontend.vercel.app
```

9. Faça o primeiro deploy.
10. Copie o **domínio estável de produção** (ex.: `https://nome-do-projeto.vercel.app`).
11. Teste o health check:

```bash
curl https://nome-do-projeto.vercel.app/health
```

12. Defina a URL do webhook:

```env
ASAAS_WEBHOOK_URL=https://nome-do-projeto.vercel.app/webhooks/asaas
```

13. Adicione `ASAAS_WEBHOOK_URL` nas variáveis da Vercel e faça redeploy se necessário.
14. Cadastre a mesma URL no painel Sandbox do Asaas.

### Erro "No Output Directory named public"

Esse erro ocorre quando a Vercel trata a API como site estático (Framework = Other + Output Directory = `public`). O arquivo `apps/api/vercel.json` corrige isso forçando `"framework": "nestjs"`. Se persistir, limpe manualmente o **Output Directory** nas configurações do projeto na Vercel.

### Erro "exited with 127" no build

Exit code **127** significa que um comando do build não foi encontrado (`tsc`, `nest` ou `prisma`). Isso acontece quando `NODE_ENV=production` está definido nas variáveis da Vercel: o npm instala só `dependencies` e ignora `devDependencies`, onde ficam as ferramentas de build.

O `apps/api/vercel.json` usa `npm ci --include=dev` no install para contornar isso. Se o erro persistir, confirme que o **Install Command** do projeto não foi sobrescrito manualmente nas configurações da Vercel.

> Use o domínio **Production**, não URLs temporárias de Preview Deployment.

### Migrations Prisma

O `prisma generate` roda automaticamente no `postinstall`. Migrations **não** rodam no deploy — execute manualmente:

```bash
cd apps/api
npx prisma migrate deploy
```

### Comandos para teste

**Health local** (porta padrão `3001`, ou `API_PORT` se definido):

```bash
curl http://localhost:3001/health
```

**Webhook local:**

```bash
curl -i -X POST http://localhost:3001/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: SEU_TOKEN_LOCAL" \
  -d '{
    "id": "evt_test_001",
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_001",
      "subscription": "sub_test_001",
      "status": "CONFIRMED",
      "value": 99.90
    }
  }'
```

**Health em produção:**

```bash
curl https://nome-do-projeto.vercel.app/health
```

**Webhook em produção:**

```bash
curl -i -X POST https://nome-do-projeto.vercel.app/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: SEU_TOKEN" \
  -d '{
    "id": "evt_test_002",
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test_002",
      "status": "RECEIVED"
    }
  }'
```

Resposta esperada: `HTTP/2 200` com `{ "received": true, "duplicate": false }`.

## Produtos seed

| Produto | Tipo | Valor |
|---------|------|-------|
| Pagamento PIX de teste | ONE_TIME | R$ 15,00 |
| Pagamento com cartão | ONE_TIME | R$ 25,00 |
| Plano mensal básico | SUBSCRIPTION | R$ 39,90 |
| Plano mensal profissional | SUBSCRIPTION | R$ 79,90 |

## Páginas do frontend

- `/login`, `/dashboard`
- `/customers`, `/customers/new`, `/customers/[id]`
- `/products`, `/products/new`, `/products/[id]`
- `/checkout/new` — criar Checkout (PIX, cartão, assinatura)
- `/checkouts`, `/checkouts/[id]`
- `/payments`, `/payments/[id]`
- `/subscriptions`, `/subscriptions/[id]`
- `/webhooks`, `/webhooks/[id]`
- `/audit`, `/settings`, `/sandbox` (dev + ADMIN)
- `/checkout/success|pending|canceled|error`

## Endpoints adicionais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST/PATCH | `/products` | CRUD de produtos |
| GET | `/checkouts` | Listar checkouts |
| GET | `/checkouts/:id` | Detalhe do checkout |
| POST | `/checkouts/:id/reconcile` | Reconciliar checkout |
| GET | `/admin/sandbox` | Ferramentas sandbox (ADMIN) |

---

Desenvolvido como base de aprendizado. Evolua incrementalmente validando cada fluxo contra a documentação oficial do Asaas.
