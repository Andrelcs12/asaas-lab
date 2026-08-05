# Asaas Payment Lab — Guia Mestre

Documento único de arquitetura, conceitos e regras. Baseado no código real do repositório. Para operação e setup, veja [`README.md`](../README.md). Para testar no Sandbox, veja [`ASAAS_TEST_CHECKLIST.md`](ASAAS_TEST_CHECKLIST.md).

---

## 1 — Visão rápida (~10 min)

### Fluxo principal

```text
Frontend (features/*.service.ts)
  → Controller + DTO + @Roles
    → Service (orquestra Prisma + Provider)
      → PaymentProvider (AsaasPaymentProvider | MockPaymentProvider)
        → Asaas API Sandbox
          → Webhook POST /webhooks/asaas
            → WebhooksService (persiste → 200 → cron processa)
              → PaymentsService.upsertFromWebhook()
                → PostgreSQL
                  → UI atualizada (/payments, /subscriptions)
```

**Regra de ouro:** o callback `/checkout/success` é só UX. Pagamento confirmado vem do **webhook** ou da **reconciliação**.

### Entidades

| Entidade | Uma frase |
|----------|-----------|
| **Customer** | Cliente local; sincronizado com Asaas via `asaasCustomerId` |
| **Product** | Catálogo de cobrança (ONE_TIME ou SUBSCRIPTION) |
| **PaymentOrder** | Intenção interna de cobrar — ainda não é dinheiro recebido |
| **Checkout** | Sessão/link hospedado no Asaas (`checkoutUrl`) |
| **Payment** | Cobrança real confirmada, com `asaasPaymentId` único |
| **Subscription** | Recorrência mensal controlada pelo Asaas |
| **WebhookEvent** | Fila de eventos recebidos do Asaas |
| **AuditLog** | Trilha de ações administrativas |

### Relações

```text
PaymentOrder (1) ── Checkout (0..1)
PaymentOrder (1) ── Payment (0..N)
Subscription (1) ── Payment (N)    ← cada renovação = novo Payment
```

---

## 2 — O núcleo financeiro

### Customer

```text
Cliente local (Customer)
  → POST /customers/:id/sync
    → CustomersService.sync()
      → provider.createCustomer() ou updateCustomer()
        → asaasCustomerId salvo, syncStatus = SYNCED
```

**Regra:** nunca criar Checkout sem `ensureSynced()`. Se `asaasCustomerId` já existe, não chama `createCustomer` de novo.

Campos-chave: `asaasCustomerId`, `syncStatus` (PENDING / SYNCED / FAILED), `lastSyncError`.

### Pagamento único

```text
PaymentOrder (intenção)
  → Checkout (link Asaas)
    → Payment (cobrança confirmada via webhook)
```

Fluxo: `POST /payment-orders/pix` ou `/credit-card` → `PaymentOrdersService.createCheckout()` → `provider.createPixCheckout()` / `createCreditCardCheckout()` → `POST /v3/checkouts`.

`externalReference` = `payment_order_{uuid}` — elo entre order local e payload Asaas.

### Assinatura

```text
Subscription (PENDING)
  → PaymentOrder SUBSCRIPTION_INITIAL
    → Checkout CREDIT_CARD_SUBSCRIPTION (chargeTypes: RECURRENT)
      → cobrança inicial → Payment
        → renovações mensais → novos Payments (renewalNumber)
```

**Regra:** Subscription só fica ACTIVE com evidência do Asaas (webhook), **não** ao criar o Checkout.

### Webhook

```text
Evento recebido
  → valida token (timingSafeEqual)
    → dedup por asaasEventId UNIQUE
      → INSERT WebhookEvent PENDING
        → HTTP 200 imediato
          → cron 30s: processPendingEvents()
            → handlePaymentEvent / handleSubscriptionEvent
              → PROCESSED | IGNORED | FAILED (retry backoff, max 5)
```

Arquivos: `webhooks/controllers/asaas-webhook.controller.ts`, `webhooks/webhooks.service.ts`.

**Por que responder antes de processar:** Asaas reenvia se demorar; falha no processamento não pode perder o evento.

### Reconciliação

```text
Estado local  ↔  consulta GET /payments/{id} no Asaas
```

Cron a cada 10 min (`ReconciliationService`) + manual: `POST /payments/:id/reconcile`, `POST /admin/reconciliation/run`.

Rede de segurança quando webhook atrasa ou túnel cai.

---

## 3 — PIX

| Etapa | Onde no código |
|-------|----------------|
| UI | `apps/web/src/app/(dashboard)/checkout/new/page.tsx` |
| Front service | `checkout-flow.service.ts` → `POST /payment-orders/pix` |
| Orquestração | `PaymentOrdersService.createPix()` → `createCheckout(..., PIX)` |
| Provider | `AsaasPaymentProvider.createPixCheckout()` → `billingTypes: ['PIX']` |
| Persistência checkout | `CheckoutsService.createRecord()` + `markCreated()` |
| Webhook | `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `upsertFromWebhook()` |
| UI resultado | `/payments`, `/payments/[id]` |

**Regras PIX:**
- Cliente deve estar SYNCED antes do Checkout.
- `idempotencyKey` evita Checkout duplicado no double-click.
- Callback success **não** altera status — aguarde webhook ou reconcilie.
- CONFIRMED = pago; RECEIVED = fundos disponíveis (prazo varia).

---

## 4 — Cartão

Mesmo fluxo do PIX até o provider. Diferenças:

| Aspecto | Detalhe |
|---------|---------|
| Tipo checkout | `CheckoutType.CREDIT_CARD_ONE_TIME` |
| Provider | `createCreditCardCheckout()` → `billingTypes: ['CREDIT_CARD']` |
| Dados sensíveis | Cartão digitado **só na página Asaas** — lab nunca recebe PAN/CVV |
| Aprovação | Webhook `PAYMENT_*` |
| Recusa | `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` |
| Estorno | `POST /payments/:id/refund` → `provider.refundPayment()` |
| Parcelamento | **Não implementado** — Checkout hospedado sem installment |

**Regra:** nunca capturar cartão no frontend ou backend deste lab.

---

## 5 — Assinatura

| Fase | Comportamento |
|------|---------------|
| Criação local | `SubscriptionsService.createMonthly()` → status `PENDING` |
| Checkout | `createRecurringCreditCardCheckout()` + objeto `subscription` |
| Ativação | Webhook `SUBSCRIPTION_CREATED` + `PAYMENT_*` |
| Cobrança inicial | Payment vinculado à order `SUBSCRIPTION_INITIAL` |
| Renovação | Novo `asaasPaymentId` → novo Payment com `renewalNumber` |
| Inadimplência | Status OVERDUE no Payment; subscription OVERDUE parcialmente mapeado |
| Pausa | `PUT /subscriptions/{id}` status INACTIVE → local `PAUSED` |
| Reativação | status ACTIVE → local `ACTIVE` |
| Cancelamento | `DELETE /subscriptions/{id}` → local `CANCELED` (histórico preservado) |

Endpoints: `POST /subscriptions/:id/pause`, `/resume`, `/cancel`.

**Regra:** cancelamento exige motivo (DTO). Histórico e payments anteriores **não** são apagados.

---

## 6 — Confiabilidade

### Idempotência

| Cenário | Proteção |
|---------|----------|
| Double-click Checkout | `PaymentOrder.idempotencyKey` UNIQUE |
| Webhook duplicado | `WebhookEvent.asaasEventId` UNIQUE → 200, sem efeito |
| Payment duplicado | `Payment.asaasPaymentId` UNIQUE + upsert |
| Ligação order ↔ evento | `PaymentOrder.externalReference` UNIQUE |

### Precedência de status

`shouldAdvancePaymentStatus()` em `packages/shared/src/utils.ts` — nunca regride (ex.: RECEIVED não volta para PENDING).

Exemplo: se `RECEIVED` chegar antes de `CONFIRMED`, o rank superior prevalece na próxima atualização.

### Evento fora de ordem

Upsert por `asaasPaymentId`; status só avança se rank incoming ≥ current.

### Retry

Webhook FAILED → backoff exponencial, max 5 tentativas. Reprocessamento manual em `/webhooks` (admin).

### Transações

Operações críticas usam Prisma; fila de webhook desacopla recepção HTTP do processamento.

### Reconciliação

Consulta fonte da verdade remota. Lock `running` in-memory — **não funciona multi-instância** sem lock distribuído.

---

## 7 — Arquivos essenciais (máx. 8)

| # | Caminho | Responsabilidade | O que compreender |
|---|---------|------------------|-------------------|
| 1 | `apps/api/prisma/schema.prisma` | Modelo de dados | Relações, UNIQUE constraints, enums |
| 2 | `packages/shared/src/types.ts` | Interface `PaymentProvider` | Contrato entre lab e Asaas |
| 3 | `apps/api/src/asaas/asaas-payment.provider.ts` | Implementação Asaas | Payloads de Checkout, subscription, refund |
| 4 | `apps/api/src/customers/customers.service.ts` | CRUD + sync | `sync()`, `ensureSynced()` |
| 5 | `apps/api/src/payment-orders/payment-orders.service.ts` | PIX e cartão | `createCheckout()`, idempotência |
| 6 | `apps/api/src/subscriptions/subscriptions.service.ts` | Recorrência | `createMonthly()`, pause/resume/cancel |
| 7 | `apps/api/src/webhooks/webhooks.service.ts` | Fila de eventos | `receive()`, `processPendingEvents()` |
| 8 | `apps/api/src/reconciliation/reconciliation.service.ts` | Sync local↔remoto | Cron + `run()` |

Utilitário transversal: `packages/shared/src/utils.ts` — mappers e `buildExternalReference`.

---

## 8 — Segurança

| Controle | Onde |
|----------|------|
| API Key | `.env` → `AsaasHttpClient` (nunca no frontend) |
| Token webhook | `WebhooksService.validateToken()` — timing-safe |
| JWT | `JwtAuthGuard`, login `POST /auth/login` |
| Roles | `RolesGuard` + `@Roles(ADMIN)` — VIEWER = 403 em escrita |
| Validação | `ValidationPipe` global com whitelist |
| CORS | `bootstrap.ts` → origem `WEB_URL` |
| Helmet | `bootstrap.ts` |
| Logs | `sanitizeForLog()` — mascara secrets |
| Cartão | Nunca persiste — Checkout Asaas |
| Rate limiting | **Não implementado** |

JWT default `local-dev-only-change-me` — trocar em qualquer ambiente exposto.

---

## 9 — Projeto de aluguel

| Asaas Lab | Sistema de aluguel |
|-----------|-------------------|
| Customer | Cliente locatário |
| Product | Plano ou modalidade |
| PaymentOrder | Intenção de cobrança da locação |
| Checkout | Link enviado ao cliente |
| Payment | Pagamento do aluguel |
| Subscription | Recorrência mensal |
| WebhookEvent | Evento financeiro |
| AuditLog | Auditoria |

### Fluxo único

```text
Rental → PaymentOrder → Checkout → Payment (webhook confirma)
```

### Fluxo recorrente

```text
Rental → Subscription → cobrança inicial → renovações mensais (Payments)
```

### Regras de adaptação

- **Caução não passa pelo Asaas no MVP** — registro manual (valor, forma, status, auditoria).
- **Não copiar o lab cegamente** — adaptar domínio, auth (Supabase no projeto real), FK `rentalId`.
- **Liberar moto só após Payment confirmado** — webhook ou reconciliação, nunca callback.
- Cancelar Subscription ao encerrar locação; inadimplência → bloqueio operacional.
- Reutilizar: `AsaasModule`, `PaymentProvider`, webhooks, reconciliação, mappers em `shared`.

---

## 10 — O que preciso dominar (10 pontos)

1. **Customer local vs Asaas** — sync antes de cobrar; `asaasCustomerId` evita duplicata remota.
2. **PaymentOrder vs Checkout vs Payment** — intenção → sessão → cobrança real.
3. **Checkout hospedado** — cartão/PIX na página Asaas; lab só gera link.
4. **PIX** — webhook confirma; callback não.
5. **Cartão** — aprovação/recusa/estorno via eventos Asaas.
6. **Subscription e renovações** — cada mês = novo Payment com `asaasPaymentId` único.
7. **Webhook** — persistir → 200 → processar depois.
8. **Idempotência** — eventId, paymentId, idempotencyKey.
9. **Precedência de estados** — `shouldAdvancePaymentStatus`.
10. **Reconciliação** — fallback quando webhook falha.

---

## 11 — O que posso consultar (não decorar)

- Lista completa de eventos Asaas
- Todos os DTOs e payloads JSON
- Todos os status internos e remotos
- Configuração detalhada de deploy Vercel
- Detalhes visuais do frontend
- Suite completa de testes

Use Swagger (`/docs`) e código-fonte como referência sob demanda.

---

## 12 — Autoavaliação

Responda antes de abrir as respostas.

**1.** Por que `/checkout/success` não confirma pagamento?

<details>
<summary>Resposta</summary>
É redirect de UX após o Checkout. Confirmação financeira vem do Asaas via webhook ou reconciliação — o cliente pode fechar a aba antes do pagamento concluir.
</details>

**2.** Qual a diferença entre PaymentOrder e Payment?

<details>
<summary>Resposta</summary>
PaymentOrder = intenção interna de cobrar. Payment = cobrança real com `asaasPaymentId`, criada/atualizada quando o Asaas confirma via webhook.
</details>

**3.** O que impede Checkout duplicado no double-click?

<details>
<summary>Resposta</summary>
`idempotencyKey` UNIQUE na PaymentOrder. Se a order existente não está terminal e já tem `checkoutUrl`, retorna a mesma sessão.
</details>

**4.** Por que cada renovação gera um Payment novo?

<details>
<summary>Resposta</summary>
Cada cobrança mensal tem `asaasPaymentId` único no Asaas. O upsert usa esse ID como chave — N payments por subscription.
</details>

**5.** Webhook chega duas vezes — o que acontece?

<details>
<summary>Resposta</summary>
Segundo evento: `asaasEventId` já existe → HTTP 200 com `duplicate: true`, sem reprocessar.
</details>

**6.** Para que serve a reconciliação?

<details>
<summary>Resposta</summary>
Consultar o Asaas quando webhook atrasa, falha ou túnel expira. Corrige divergência local ↔ remota.
</details>

**7.** Onde fica a API Key?

<details>
<summary>Resposta</summary>
Variável `ASAAS_API_KEY` no backend, injetada em `AsaasHttpClient`. Nunca no browser.
</details>

**8.** Assinatura fica ACTIVE ao criar Checkout?

<details>
<summary>Resposta</summary>
Não. Fica PENDING até webhook (`SUBSCRIPTION_CREATED` / pagamento inicial) confirmar evidência remota.
</details>

**9.** O que impede status regredir de RECEIVED para PENDING?

<details>
<summary>Resposta</summary>
`shouldAdvancePaymentStatus()` compara ranks — status só avança ou mantém, nunca regride.
</details>

**10.** A caução da locação passa pelo Asaas?

<details>
<summary>Resposta</summary>
Não no MVP. Caução é registro manual no sistema de aluguel, fora deste módulo financeiro.
</details>

---

## SPRINT DE DOMÍNIO — UMA SESSÃO

Objetivo: conseguir **explicar, testar e adaptar** o fluxo financeiro com revisão técnica. Uma sessão não torna especialista em pagamentos — solidifica o necessário para implementar com segurança.

### 15 min — visão geral
Ler seções 1 e 2 deste guia. Desenhar o fluxo Frontend → Asaas → Webhook → DB.

### 40 min — PIX e cartão
Abrir `payment-orders.service.ts` (`createCheckout`) e `asaas-payment.provider.ts`. Comparar `createPixCheckout` vs `createCreditCardCheckout`.

### 40 min — assinatura
Abrir `subscriptions.service.ts` (`createMonthly`). Entender PENDING → ACTIVE e por que renovação = novo Payment.

### 50 min — webhook e confiabilidade
Ler `webhooks.service.ts` (`receive`, `processPendingEvents`). Entender idempotência e `shouldAdvancePaymentStatus`.

### 35 min — prática Sandbox
Customer → sync → Checkout → pagar → verificar `/webhooks` e `/payments`. Ver [`ASAAS_TEST_CHECKLIST.md`](ASAAS_TEST_CHECKLIST.md).

### 20 min — projeto de aluguel
Mapear entidades para `Rental`. Definir: o que libera a moto? Onde entra a caução manual?

**Critério de sucesso:** explicar em voz alta o caminho de um PIX da criação até o Payment confirmado, citando arquivos reais.
