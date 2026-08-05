# Asaas Payment Lab — Testes no Sandbox

Roteiro prático para validar fluxos. Arquitetura e conceitos: [`ASAAS_MASTER_GUIDE.md`](ASAAS_MASTER_GUIDE.md). Setup: [`README.md`](../README.md).

---

## Preparação

Antes de qualquer teste:

1. `.env` com `ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`, `DATABASE_URL`, `JWT_SECRET`, `PAYMENT_PROVIDER=asaas`
2. `docker compose up -d` + migrations + seed + `npm run dev`
3. Health: `GET /health`, `/health/database`, `/health/asaas` — todos OK
4. Túnel HTTPS apontando para `POST /webhooks/asaas` (ngrok, Cloudflare Tunnel ou deploy)
5. Webhook cadastrado no painel Sandbox com header `asaas-access-token`

---

## Teste 1 — Customer

| Item | Valor |
|------|-------|
| Interface | `/customers/new` → detalhe `/customers/[id]` |
| Ação | Criar cliente → botão **Sincronizar** |
| Esperado | `syncStatus=SYNCED`, `asaasCustomerId` preenchido |
| Verificar | Detalhe do customer; `GET /health/asaas` |
| Se falhar | `lastSyncError` no customer; conferir API Key; retry em `/sync` |

---

## Teste 2 — PIX

| Item | Valor |
|------|-------|
| Produto | "Pagamento PIX de teste" (R$ 15,00) |
| Interface | `/checkout/new` → fluxo PIX |
| Ação | Cliente SYNCED → criar Checkout → abrir link Sandbox → pagar |
| Webhook esperado | `PAYMENT_CONFIRMED` e/ou `PAYMENT_RECEIVED` |
| Pagamento esperado | Registro em `/payments` com status CONFIRMED/RECEIVED |
| Verificar | `/webhooks` (evento PROCESSED), `/payments/[id]`, `/checkouts/[id]` |
| Se falhar | Token webhook; URL pública; reconciliar em `/payments/[id]` |

**Regra:** callback `/checkout/success` não prova pagamento — confie no webhook ou reconcilie.

---

## Teste 3 — Cartão único

Produto: "Pagamento com cartão" (R$ 25,00). Interface: `/checkout/new` → cartão.

### Cartão aprovado
- Usar cartão de teste do Sandbox Asaas
- Esperado: Payment CONFIRMED/RECEIVED em `/payments`

### Cartão recusado
- Usar cartão de recusa documentado pelo Sandbox
- Esperado: evento `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` ou Payment FAILED

Verificar sempre `/webhooks` e `/payments`.

---

## Teste 4 — Assinatura (criação e ativação)

| Item | Valor |
|------|-------|
| Produto | "Plano mensal básico" (R$ 39,90) |
| Interface | `/checkout/new` → assinatura |
| Esperado inicial | Subscription `PENDING` — **não** ACTIVE ao criar Checkout |
| Após pagamento | Subscription `ACTIVE`; Payment inicial em `/payments` |
| Verificar | `/subscriptions/[id]`, webhooks `SUBSCRIPTION_*` e `PAYMENT_*` |

---

## Teste 5 — Webhook

| Cenário | Como testar | Esperado |
|---------|-------------|----------|
| Token válido | Evento real do Sandbox ou curl com header correto | 200, `{ received: true }` |
| Token inválido | curl sem header ou token errado | 401, evento **não** persistido |
| Duplicado | Reenviar mesmo `payload.id` | 200, `{ duplicate: true }` |
| Desconhecido | Evento não mapeado | WebhookEvent `IGNORED` |
| Reprocessamento | `/webhooks` → reprocessar evento FAILED | Status PROCESSED após retry |

Exemplo curl local:

```bash
curl -i -X POST http://localhost:4000/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: SEU_TOKEN" \
  -d '{"id":"evt_test_001","event":"PAYMENT_CONFIRMED","payment":{"id":"pay_test_001","status":"CONFIRMED","value":15.00}}'
```

---

## Teste 6 — Reconciliação

| Cenário | Ação | Esperado |
|---------|------|----------|
| Pagamento | `/payments/[id]` → Reconciliar | Status alinhado com Asaas |
| Assinatura | `/subscriptions/[id]` → Reconciliar | Status e `nextDueDate` atualizados |
| Geral | `/settings` ou `POST /admin/reconciliation/run` | Divergências corrigidas |

Use quando webhook atrasa ou após simular falha de túnel.

---

## Teste 7 — Assinatura (lifecycle)

Pré-requisito: assinatura ACTIVE com `asaasSubscriptionId`.

| Ação | Endpoint | Esperado local |
|------|----------|----------------|
| Inativar | `POST /subscriptions/:id/pause` | `PAUSED` |
| Reativar | `POST /subscriptions/:id/resume` | `ACTIVE` |
| Cancelar | `POST /subscriptions/:id/cancel` + motivo | `CANCELED`, histórico preservado |

Interface: `/subscriptions/[id]`. Somente ADMIN.

---

## Teste 8 — Estorno

Pré-requisito: Payment CONFIRMED ou RECEIVED com `asaasPaymentId`.

| Cenário | Ação | Esperado |
|---------|------|----------|
| Integral | `/payments/[id]` → Estornar (sem valor) | Status REFUNDED |
| Parcial | Estornar com valor menor | Status REFUNDED, valor parcial |
| Erro | Valor maior que pagamento ou sem ID externo | 400 |

Endpoint: `POST /payments/:id/refund`. Somente ADMIN.

---

## Teste 9 — Permissões

Login como cada papel e tentar criar Checkout (`/checkout/new`):

| Papel | Esperado |
|-------|----------|
| ADMIN | Sucesso |
| VIEWER | 403 |
| Sem autenticação | 401 |

---

## Teste 10 — Build e qualidade

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Registrar resultado. Build pode falhar intermitente no Windows por lock do Prisma (`EPERM`) — retry ou testar em Linux.

---

## Registro de evidências

Preencher após execução no Sandbox:

| Data | Fluxo | ID externo (mascarado) | Evento | Estado DB | Resultado |
| ---- | ----- | ---------------------- | ------ | --------- | --------- |
| — | Customer | — | — | — | Pendente |
| — | PIX | — | PAYMENT_* | — | Pendente |
| — | Cartão | — | PAYMENT_* | — | Pendente |
| — | Assinatura | — | SUBSCRIPTION_* | — | Pendente |
| — | Webhook | — | — | PROCESSED | Pendente |
| — | Reconciliação | — | — | — | Pendente |
| — | Cancelamento | — | — | CANCELED | Pendente |
| — | Estorno | — | REFUNDED | — | Pendente |

---

## Tabela de cobertura

| Fluxo | Local | Mock | Sandbox | Resultado |
| ----- | ----: | ---: | ------: | --------- |
| Customer | | | | |
| PIX | | | | |
| Cartão | | | | |
| Assinatura | | | | |
| Renovação | | | | |
| Webhook | | | | |
| Reconciliação | | | | |
| Cancelamento | | | | |
| Estorno | | | | |

Legenda sugerida: Implementado · Validado localmente · Validado com mock · Pendente Sandbox.

---

## Diagnóstico rápido

| Sintoma | Causa provável | Onde olhar |
|---------|----------------|------------|
| Checkout não cria | Customer não SYNCED ou API Key vazia | Customer detail, `/health/asaas` |
| Pagou mas Payment não aparece | Webhook não chegou | `/webhooks`, túnel, token |
| Status travado | Evento duplicado ignorado ou precedência | WebhookEvent, reconciliar |
| 401 no webhook | Token divergente | `.env` vs painel Asaas |
| Cron não processa | Serverless ou API parada | Deploy persistente; logs API |
| Estorno falha | Status não CONFIRMED/RECEIVED | Detalhe do Payment |
