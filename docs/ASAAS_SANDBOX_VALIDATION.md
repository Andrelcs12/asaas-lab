# Validação Sandbox — Asaas Payment Lab

**Data:** 5 de agosto de 2026  
**Ambiente:** Sandbox (`https://api-sandbox.asaas.com/v3`)

## Pré-requisitos

```env
ASAAS_API_KEY=$aact_hmlg_...
ASAAS_WEBHOOK_AUTH_TOKEN=<token-escolhido>
ASAAS_WEBHOOK_URL=https://<seu-tunel>/webhooks/asaas
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asaas_payment_lab
JWT_SECRET=<random>
PAYMENT_PROVIDER=asaas
API_PORT=4000
WEB_URL=http://localhost:3000
```

## Ordem de testes

### 1. Customer
- Tela: `/customers/new`
- Ação: criar cliente → `/customers/:id` → **Sincronizar**
- Esperado: `syncStatus=SYNCED`, `asaasCustomerId` preenchido

### 2. PIX
- Tela: `/checkout/new` → fluxo PIX → produto "Pagamento PIX de teste"
- Esperado: link Checkout abre no Sandbox
- Após pagar: webhook `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `/payments`

### 3. Cartão único
- Produto "Pagamento com cartão" (R$ 25,00)
- Cartão teste Asaas Sandbox

### 4. Assinatura
- Produto "Plano mensal básico"
- Esperado: subscription `PENDING` → `ACTIVE` após webhook (não ao criar checkout)

### 5–11. Demais fluxos
Ver matriz em `ASAAS_TEST_MATRIX.md`

## Registro de evidências

| Data | Fluxo | ID externo (mascarado) | Evento | Estado DB | Página | Resultado |
| ---- | ----- | ---------------------- | ------ | --------- | ------ | --------- |
| — | — | — | — | — | — | Pendente execução manual |
