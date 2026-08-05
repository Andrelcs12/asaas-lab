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

# 5. Desenvolvimento (API :3333 + Web :3000)
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
