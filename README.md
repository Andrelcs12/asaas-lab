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
| **Payment Order** | Intenção interna antes do Checkout |
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
| POST | `/payment-orders/pix` | Checkout PIX |
| POST | `/payment-orders/credit-card` | Checkout cartão |
| POST | `/subscriptions/monthly` | Assinatura mensal |
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

## Páginas do frontend

- `/login`, `/dashboard`
- `/customers`, `/customers/new`, `/customers/[id]`
- `/payments`, `/payments/new`, `/payments/[id]`
- `/subscriptions`, `/subscriptions/[id]`
- `/webhooks`, `/webhooks/[id]`
- `/audit`, `/settings`, `/sandbox` (dev)
- `/checkout/success|pending|canceled|error`

## Deploy do backend na Vercel

> **Root Directory na Vercel:** `apps/api`  
> **Framework detectado:** NestJS (zero config — [documentação oficial](https://vercel.com/docs/frameworks/backend/nestjs))  
> **Sem prefixo global** — rotas públicas: `GET /health` e `POST /webhooks/asaas`

### Passo a passo

1. Faça push do repositório para o GitHub.
2. Abra [vercel.com/new](https://vercel.com/new) e importe o repositório.
3. Em **Root Directory**, selecione `apps/api`.
4. Confirme que o framework **NestJS** foi detectado automaticamente.
5. Adicione as variáveis de ambiente:

```env
NODE_ENV=production
ASAAS_ENV=sandbox
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=valor_sandbox
ASAAS_WEBHOOK_AUTH_TOKEN=token_gerado_no_painel
```

6. Para uso completo (auth, dashboard, Prisma), adicione também:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=valor-seguro-aleatorio
WEB_URL=https://seu-frontend.vercel.app
```

7. Faça o primeiro deploy.
8. Copie o **domínio estável de produção** (ex.: `https://nome-do-projeto.vercel.app`).
9. Teste o health check:

```bash
curl https://nome-do-projeto.vercel.app/health
```

10. Defina a URL do webhook:

```env
ASAAS_WEBHOOK_URL=https://nome-do-projeto.vercel.app/webhooks/asaas
```

11. Adicione `ASAAS_WEBHOOK_URL` nas variáveis da Vercel e faça redeploy se necessário.
12. Cadastre a mesma URL no painel Sandbox do Asaas.

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

Resposta esperada: `HTTP/2 200` com `{ "received": true, "eventId": "evt_test_002" }`.

## Evoluindo o lab

Sugestões para próximos passos:

1. Configurar ngrok e validar webhooks reais
2. Testar fluxo PIX completo no Sandbox
3. Observar eventos `PAYMENT_CONFIRMED` → `PAYMENT_RECEIVED`
4. Criar assinatura e acompanhar renovações como pagamentos separados
5. Explorar reconciliação manual quando webhook falhar
6. Ler logs de auditoria após cada operação financeira

---

Desenvolvido como base de aprendizado. Evolua incrementalmente validando cada fluxo contra a documentação oficial do Asaas.
