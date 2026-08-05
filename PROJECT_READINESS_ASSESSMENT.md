# Auditoria Técnica — Asaas Payment Lab

**Data:** 5 de agosto de 2026  
**Escopo:** Diagnóstico baseado em evidências do repositório, execução de comandos e leitura de código. Nenhuma alteração de código foi realizada.

---

## 1. Resumo executivo

O **Asaas Payment Lab** é um monorepo npm workspaces com backend NestJS 11 + Fastify + Prisma + PostgreSQL e frontend Next.js 16. A arquitetura conceitual é sólida: separação entre `PaymentOrder` (intenção), `Payment` (cobrança confirmada), `Subscription`, fila de webhooks em PostgreSQL, reconciliação e auditoria.

Porém, o laboratório **não está funcional de ponta a ponta**. A descoberta mais crítica é que o endpoint público `POST /webhooks/asaas` usa `AsaasWebhookService`, que **apenas valida token e registra log** — não persiste nem processa eventos. O `WebhooksService` completo (persistência, idempotência, fila, retry, atualização de pagamentos) existe, mas **não está conectado ao controller público**.

Consequências:

- Pagamentos criados via Checkout **não serão confirmados automaticamente** no fluxo atual.
- A reconciliação periódica mitiga parcialmente, mas depende de `asaasPaymentId` já existir localmente — o que normalmente vem do webhook.
- Não há evidência no repositório de homologação real no Sandbox Asaas (sem logs, scripts, fixtures ou documentação de testes manuais).
- Estornos não estão implementados (apenas mapeamento de status).
- Testes cobrem utilitários e autenticação de webhook, não fluxos financeiros completos.

**Veredito:** `GO COM RESTRIÇÕES — adaptar após correções específicas`

O lab reduz risco arquitetural (~40% do caminho financeiro), mas **não pode ser copiado para produção** sem corrigir webhooks, validar no Sandbox e implementar estornos, testes e hardening.

---

## 2. Estado atual

### 2.1 Estrutura do monorepo

```text
/
├── apps/
│   ├── api/          # NestJS + Fastify + Prisma
│   └── web/          # Next.js 16 + React 19 + Tailwind 4
├── packages/
│   └── shared/       # Enums, schemas Zod, tipos, utils
├── docker-compose.yml
├── .env.example
└── package.json
```

| Componente | Tecnologia | Evidência |
|-----------|------------|-----------|
| Backend | NestJS 11, Fastify, Prisma 6.5, JWT, Swagger, Schedule | `apps/api/package.json` |
| Frontend | Next.js 16.3, React 19, TanStack Query, RHF, Zod | `apps/web/package.json` |
| Banco | PostgreSQL 16 (Docker) | `docker-compose.yml`, `schema.prisma` |
| Shared | Enums, mapeamentos Asaas, schemas | `packages/shared/` |
| Infra local | Docker Compose | Apenas PostgreSQL |

**Ausências relevantes:** Supabase, Cloudinary, Render/Vercel config files (`vercel.json` não encontrado), CI/CD, rate limiting, fila externa (Redis/Bull).

### 2.2 Migrations e seed

- **1 migration inicial** (`20250805120000_init`) + **1 migration de índices** (`20260805155201`).
- **Seed explícito:** dados fictícios; README e seed declaram: *"Dados fictícios e não representam integração real com o Asaas"*.
- IDs Asaas no seed (`cus_seed_001`, `pay_seed_confirmed`) são placeholders.

### 2.3 Configuração Sandbox

`.env.example` define:

- `ASAAS_ENV=sandbox`
- `ASAAS_API_URL=https://api-sandbox.asaas.com/v3`
- `ASAAS_API_KEY=` (vazio)
- `ASAAS_WEBHOOK_AUTH_TOKEN=` (vazio)
- `PAYMENT_PROVIDER=asaas` (alternativa: `mock`)

Sem API Key configurada no repositório (correto por segurança). Sem evidência de que alguém preencheu e testou.

---

## 3. Resultados dos comandos

| Comando | Resultado | Detalhes |
|---------|-----------|----------|
| `npm install` | ✅ Sucesso | 713 pacotes; 8 vulnerabilidades reportadas (7 high, 1 critical) |
| `npm run lint` | ✅ Sucesso | `tsc --noEmit` em shared, api, web |
| `npm run typecheck` | ✅ Sucesso | Idêntico ao lint |
| `npm run test` | ✅ Sucesso | 14 testes (10 shared + 4 api) |
| `npm run test:e2e` | ✅ Sucesso | 6 testes e2e (health + webhook token) |
| `npm run build` | ⚠️ Falha parcial | Falhou em `prisma generate` com `EPERM` (Windows, lock de arquivo). `nest build` isolado passou. `web` build passou isoladamente. |

### 3.1 Análise do build

- **Causa provável:** lock do `query_engine-windows.dll.node` no Windows (processo Prisma concorrente ou antivírus).
- **Impacto:** CI/local pode falhar intermitentemente; não indica erro de código TypeScript.
- **Correção recomendada:** garantir que nenhum processo segura o client Prisma; considerar script de build com retry; validar em Linux (Render).

### 3.2 Cobertura de testes executada

| Área | Testada? |
|------|----------|
| Utils compartilhados (mapeamentos, sanitize) | ✅ |
| Token webhook (timing-safe) | ✅ |
| E2E health + webhook auth | ✅ |
| Criação de customer/checkout | ❌ |
| Processamento webhook → payment | ❌ |
| Assinatura/renovação | ❌ |
| Reconciliação | ❌ |
| Estorno | ❌ |

`apps/api/test/app.e2e-spec.ts` existe mas usa `supertest` + Express adapter — **incompatível** com Fastify e **não está no script `test:e2e`** (usa Vitest). Provavelmente legado quebrado.

---

## 4. Avaliação por funcionalidade

Legenda de classificação: ver seção 4.13.

### 4.1 Customers (8.1)

| Aspecto | Estado | Evidência |
|---------|--------|-----------|
| Criação local | ✅ | `CustomersService.create` |
| Sync com Asaas | ✅ | `POST /customers/:id/sync` → `provider.createCustomer/updateCustomer` |
| `asaasCustomerId` | ✅ | Campo + unique constraint |
| Prevenção duplicidade | ❌ | Sem unique em `cpfCnpj`; sem busca antes de criar |
| Atualização | ✅ | `PATCH /customers/:id` |
| Falha de sync | ✅ | `syncStatus=FAILED`, `lastSyncError` |
| Retry manual | ✅ | Re-chamar `/sync` |
| Validação CPF/CNPJ | ⚠️ | Apenas `min(11)` — sem algoritmo de dígito verificador |

**Classificação:** `IMPLEMENTADO SEM TESTES`

### 4.2 Checkout PIX único (8.2)

| Aspecto | Estado | Evidência |
|---------|--------|-----------|
| Ordem local | ✅ | `PaymentOrdersService.createPix` |
| `externalReference` | ✅ | `payment_order_{uuid}` |
| Idempotência | ⚠️ | Por `idempotencyKey`; retorna ordem existente se não terminal |
| Checkout real Asaas | ✅ código | `POST /checkouts` via `AsaasPaymentProvider` |
| URL retornada | ✅ | Campo `link` conforme docs oficiais |
| Callback URLs | ✅ | success/cancel/expired |
| Confirmação webhook | ❌ | Webhook público não processa |
| Vencimento/expiração | ⚠️ | Status `EXPIRED` existe no schema; handler incompleto |
| Reconciliação | ⚠️ | Existe, mas depende de `asaasPaymentId` |

**Classificação:** `IMPLEMENTADO PARCIALMENTE`

### 4.3 Checkout cartão único (8.3)

| Aspecto | Estado |
|---------|--------|
| Checkout hospedado | ✅ `chargeTypes: ['DETACHED']`, `billingTypes: ['CREDIT_CARD']` |
| Sem formulário próprio | ✅ Confirmado no frontend e provider |
| Sem armazenamento cartão | ✅ Nenhum campo sensível no schema |
| Confirmação/falha | ❌ Depende de webhook desconectado |
| Estorno | ❌ Não implementado |

**Classificação:** `IMPLEMENTADO PARCIALMENTE`

### 4.4 Assinatura recorrente (8.4)

| Aspecto | Estado | Evidência |
|---------|--------|-----------|
| Registro local | ✅ | `SubscriptionsService.createMonthly` |
| Checkout recorrente | ✅ | `chargeTypes: ['RECURRENT']` + objeto `subscription` |
| ID externo | ⚠️ | Preenchido via webhook de assinatura — webhook desconectado |
| Ciclo mensal | ✅ | `cycle: 'MONTHLY'` |
| Estados | ⚠️ | PENDING → ACTIVE via webhook (não funciona hoje) |

**Bug identificado:** `externalReference` da ordem inicial usa `payment_order_{subscriptionId}` em vez de `payment_order_{orderId}`, inconsistente com pagamentos avulsos.

**Classificação:** `IMPLEMENTADO PARCIALMENTE`

### 4.5 Renovações (8.5)

| Aspecto | Estado |
|---------|--------|
| Novo Payment por renovação | ✅ `upsertFromWebhook` com `asaasPaymentId` unique |
| Histórico preservado | ✅ Múltiplos payments por subscription |
| Relacionamento correto | ⚠️ Via `payment.subscription` no webhook |
| Prevenção duplicidade | ✅ Unique `asaasPaymentId` |
| Inadimplência | ⚠️ Status OVERDUE mapeado em payments; subscription OVERDUE não mapeado de Asaas |
| `renewalNumber` | ⚠️ Calculado como count antes do insert (off-by-one) |

**Classificação:** `IMPLEMENTADO PARCIALMENTE` (código existe, fluxo não operacional)

### 4.6 Inativação, reativação, cancelamento (8.6)

| Operação | API Asaas | Local | Evidência |
|----------|-----------|-------|-----------|
| Pausa | `PUT status: INACTIVE` | ✅ | `SubscriptionsService.pause` |
| Reativação | `PUT status: ACTIVE` | ✅ | `SubscriptionsService.resume` |
| Cancelamento | `DELETE` | ✅ | `SubscriptionsService.cancel` + motivo + auditoria |
| Validações transição | ✅ | Guards de estado duplicado |
| Histórico | ✅ | Registros não deletados |

**Classificação:** `IMPLEMENTADO SEM TESTES` (requer `asaasSubscriptionId` pré-existente)

### 4.7 Webhooks (8.7) — **BLOQUEADOR**

Existem **duas implementações paralelas**:

1. **`AsaasWebhookService`** → usado pelo controller público
   - Valida token (`timingSafeEqual`) ✅
   - Log seguro ✅
   - **Não persiste eventos** (TODO explícito no código)
   - **Não processa pagamentos**

2. **`WebhooksService`** → usado apenas pelo admin (list/reprocess)
   - Persistência PostgreSQL ✅
   - Idempotência por `asaasEventId` unique ✅
   - Fila async via cron 30s ✅
   - Retry com backoff exponencial (max 5) ✅
   - Reprocessamento manual ✅
   - **Nunca recebe eventos do endpoint público**

```typescript
// apps/api/src/webhooks/controllers/asaas-webhook.controller.ts
return this.asaasWebhookService.receive(token, payload);
// WebhooksService.receive() NÃO é chamado
```

**Classificação endpoint público:** `IMPLEMENTADO PARCIALMENTE`  
**Classificação pipeline completo:** `APENAS PLANEJADO` (código existe, não integrado)

### 4.8 Reconciliação (8.8)

| Aspecto | Estado |
|---------|--------|
| Consulta pagamento remoto | ✅ `provider.getPayment` |
| Consulta assinatura remota | ✅ `provider.getSubscription` |
| Comparação e correção | ✅ Status, datas, netValue |
| Auditoria | ✅ |
| Concorrência | ⚠️ Flag `running` in-memory (não funciona multi-instância) |
| Cron 10 min | ✅ `@Cron(EVERY_10_MINUTES)` |
| Manual | ✅ `POST /admin/reconciliation/run`, `POST /payments/:id/reconcile` |

**Limitação:** cron `@nestjs/schedule` **não roda em Vercel serverless** (README sugere deploy Vercel).

**Classificação:** `IMPLEMENTADO SEM TESTES`

### 4.9 Estornos (8.9)

| Aspecto | Estado |
|---------|--------|
| Endpoint de estorno | ❌ |
| Consulta elegibilidade | ❌ |
| Estorno parcial/integral | ❌ |
| Acompanhamento | ⚠️ Apenas recebe status REFUNDED via webhook (se webhook funcionasse) |
| Testes Sandbox | ❌ |

**Classificação:** `NÃO INICIADO` (mapeamento de enum apenas)

### 4.10 Segurança (8.10)

| Controle | Estado |
|----------|--------|
| Secrets no backend | ✅ API Key só no server |
| Validação env | ✅ `validateEnv` (campos opcionais) |
| Helmet | ✅ |
| CORS | ✅ Origem = `WEB_URL` |
| Rate limiting | ❌ Constante `RATE_LIMIT` existe, não implementado |
| JWT + roles | ✅ ADMIN/VIEWER |
| Webhook token seguro | ✅ `timingSafeEqual` |
| Sanitize logs | ✅ `sanitizeForLog` |
| JWT default inseguro | ⚠️ Fallback `'local-dev-only-change-me'` |
| Dados sensíveis no banco | ✅ Sem cartão/CVV |

**Classificação:** `IMPLEMENTADO PARCIALMENTE`

### 4.11 Observabilidade (8.11)

| Aspecto | Estado |
|---------|--------|
| Correlation ID | ⚠️ Middleware existe, **não registrado** no AppModule |
| Logs estruturados | ⚠️ Logger NestJS, parcial |
| Histórico webhook | ✅ Model + UI (dados do seed) |
| Auditoria | ✅ `AuditLog` + UI |
| Métricas | ❌ |
| Swagger | ✅ `/docs` |

**Classificação:** `IMPLEMENTADO PARCIALMENTE`

### 4.12 Testes (8.12)

| Tipo | Quantidade | Cobertura financeira |
|------|------------|---------------------|
| Unit shared | 10 | Mapeamentos, utils |
| Unit api | 4 | Token webhook |
| E2E | 6 | Health + auth webhook |
| Mock provider | ✅ | `PAYMENT_PROVIDER=mock` |
| Integração Sandbox | ❌ | Nenhuma evidência |

**Classificação:** `TESTADO COM MOCK` (utilitários) / financeiro `NÃO INICIADO`

### 4.13 Caução manual (escopo MVP)

O lab **não possui** modelagem de caução. Porém:

- `AuditLog` genérico suporta trilha de auditoria ✅
- Estados definidos pelo negócio cabem em nova entidade `Deposit/Caution` ✅
- Upload de comprovantes exigiria Cloudinary (ausente) ❌
- Fluxo manual é **simples de implementar** no sistema principal sem Asaas ✅

**Classificação caução no lab:** `NÃO INICIADO` (esperado)  
**Viabilidade no sistema principal:** `APENAS PLANEJADO` (baixa complexidade técnica)

### 4.14 Tabela consolidada de classificação

| Funcionalidade | Classificação |
|----------------|---------------|
| Customers | IMPLEMENTADO SEM TESTES |
| Checkout PIX | IMPLEMENTADO PARCIALMENTE |
| Cartão único | IMPLEMENTADO PARCIALMENTE |
| Assinatura recorrente | IMPLEMENTADO PARCIALMENTE |
| Renovações | IMPLEMENTADO PARCIALMENTE |
| Pausa/reativação/cancelamento | IMPLEMENTADO SEM TESTES |
| Webhooks (endpoint público) | IMPLEMENTADO PARCIALMENTE |
| Webhooks (pipeline completo) | APENAS PLANEJADO |
| Reconciliação | IMPLEMENTADO SEM TESTES |
| Estornos | NÃO INICIADO |
| Segurança | IMPLEMENTADO PARCIALMENTE |
| Observabilidade | IMPLEMENTADO PARCIALMENTE |
| Testes financeiros | NÃO INICIADO |
| Homologação Sandbox | NÃO INICIADO |
| Frontend lab | IMPLEMENTADO SEM TESTES |

---

## 5. Notas (0–10)

| Dimensão | Nota | Justificativa |
|----------|------|---------------|
| Arquitetura | 7.5 | Boa separação Order/Payment/Subscription, provider pattern, shared package |
| Qualidade do código | 7.0 | TypeScript limpo, convenções consistentes; duplicação webhook é grave |
| Modelagem do banco | 8.0 | Schema completo, índices, constraints; falta entidades de domínio locação/caução |
| Integração customers | 6.0 | Sync funcional no código; sem validação CPF, sem dedup |
| PIX | 5.0 | Checkout implementado; confirmação quebrada |
| Cartão único | 5.0 | Idem PIX |
| Assinatura recorrente | 4.5 | Checkout recorrente ok; lifecycle depende de webhook |
| Renovações | 4.0 | Lógica parcial; não testada; off-by-one |
| Cancelamento | 6.5 | API calls corretas conforme docs Asaas |
| Webhooks | 3.0 | **Desconexão crítica entre controller e service** |
| Idempotência | 5.5 | Orders + webhook events modelados; webhook não persiste |
| Reconciliação | 5.5 | Implementada; limitada; cron incompatível serverless |
| Estornos | 1.0 | Apenas enum mapping |
| Segurança | 6.0 | Base ok; sem rate limit; JWT default fraco |
| Logs e observabilidade | 5.0 | Audit ok; correlation ID não wired |
| Testes | 2.5 | 14 testes, nenhum fluxo financeiro |
| Documentação | 7.0 | README do lab é bom; diverge da realidade dos webhooks |
| Experiência frontend | 6.5 | Dashboard funcional; polling callback frágil |
| Capacidade de reutilização | 6.0 | Boa base, adaptação significativa necessária |
| Prontidão para produção | 2.0 | Bloqueadores múltiplos |

---

## 6. Percentuais

### 6.1 Prontidão do laboratório

**Asaas Payment Lab: 48% concluído**

| Área | Peso | % | Contribuição |
|------|------|---|--------------|
| Modelagem/schema | 15% | 85% | 12.8% |
| Providers/API Asaas | 15% | 70% | 10.5% |
| Fluxos checkout | 15% | 65% | 9.8% |
| Webhooks | 20% | 25% | 5.0% |
| Reconciliação | 10% | 60% | 6.0% |
| Assinaturas/lifecycle | 10% | 55% | 5.5% |
| Estornos | 5% | 5% | 0.3% |
| Testes | 10% | 15% | 1.5% |
| Sandbox validado | 10% | 0% | 0.0% |
| **Total** | 100% | | **~48%** |

### 6.2 Prontidão financeira do sistema principal

**Módulo financeiro do sistema de locação: 22% pronto**

O lab cobre ~48% do escopo financeiro puro. O sistema principal adiciona locação, motos, documentos, caução manual, Supabase Auth, multi-tenant operacional, Cloudinary e deploy produção — ausentes no lab.

Estimativa: 48% × 0.45 ( proporção financeira do projeto total ) ≈ **22%**

### 6.3 Reutilização estimada

| Categoria | % | Componentes |
|-----------|---|-------------|
| Reutilizável sem grandes alterações | 25% | `packages/shared` (enums, utils, schemas), padrão provider, audit service, error filter |
| Reutilizável com adaptações | 45% | HTTP client, payment provider, services (customers, orders, payments, subscriptions), schema Prisma (estendido), webhook service (após fix), reconciliation |
| Deve ser refeito | 30% | Controller webhook (integração), estornos, rate limiting, auth (Supabase), domínio locação/caução, jobs produção, testes E2E financeiros, deploy pipeline |

### 6.4 Prontidão para produção

**Prontidão de produção: 18%**

Requisitos mínimos ausentes: webhook operacional, estornos, testes integração, homologação Sandbox documentada, rate limiting, correlation ID ativo, cron em ambiente persistente, secrets management, monitoramento.

---

## 7. Matriz de reutilização

| Componente do Lab | Estado atual | Reutilizável? | Adaptação necessária | Risco |
| ----------------- | ------------ | ------------: | -------------------- | ----- |
| Asaas HTTP Client | Implementado | Sim | Retry policy, timeout tuning, error typing | Médio |
| Payment Provider | Implementado | Sim | Estornos, parcelamento se necessário | Médio |
| Customers | Implementado | Sim | Validação CPF/CNPJ, dedup, vínculo locatário | Baixo |
| Checkout PIX | Parcial | Sim | Conectar webhook, testar Sandbox | Alto |
| Cartão único | Parcial | Sim | Idem PIX | Alto |
| Assinaturas | Parcial | Sim | Fix externalReference, webhook, inadimplência | Alto |
| Webhooks | **Desconectado** | Parcial | **Unificar services no controller** | **Crítico** |
| Reconciliação | Implementado | Sim | Job runner persistente (Render), locks distribuídos | Médio |
| Auditoria | Implementado | Sim | Expandir ações para locação/caução | Baixo |
| Testes | Mínimo | Não | Reescrever suite financeira | Alto |

---

## 8. Matriz de riscos

| Risco | Probabilidade | Impacto | Evidência | Mitigação |
| ----- | ------------- | ------- | --------- | --------- |
| Evento duplicado | Média | Alto | Idempotência existe em `WebhooksService`, mas endpoint não usa | Conectar `WebhooksService.receive` ao controller |
| Webhook não recebido | Alta | Crítico | Endpoint não persiste; cron reconciliação limitado | Fix webhook + reconciliação agressiva + alertas |
| Fila pausada | Média | Alto | Cron in-memory; Vercel serverless não roda cron | Deploy API em Render com processo persistente |
| Cobrança duplicada | Baixa | Alto | `asaasPaymentId` unique; idempotencyKey em orders | Manter constraints; testes de concorrência |
| Assinatura cancelada incorretamente | Baixa | Alto | Validações de estado existem | Testes + confirmação UI |
| Renovação não registrada | Alta | Alto | Webhook desconectado | Fix webhook; reconciliação de subscription |
| Divergência banco vs Asaas | Alta | Alto | Reconciliação parcial implementada | Job periódico + dashboard divergências |
| API Key vazada | Baixa | Crítico | Key só no backend; `.env.example` sem valores | Secrets manager, rotação, scan CI |
| Saldo insuficiente estorno | Média | Médio | Estorno não implementado | Implementar com tratamento de erro Asaas |
| Confiança indevida no callback | Média | Alto | Frontend faz polling; README alerta | Manter webhook como fonte de verdade |
| Sandbox confundido com produção | Média | Crítico | `ASAAS_ENV` existe mas opcional | Guard rígido por ambiente, keys separadas |
| Caução confirmada sem conferência | Alta | Médico/Financeiro | Fora do lab; fluxo manual definido | Estados + auditoria + permissão ADMIN |

---

## 9. Dificuldade (1–10)

| Área | Nota | Fatores |
|------|------|---------|
| CRUDs e administração | 3 | Padrão NestJS + Prisma; lab já demonstra |
| Autenticação e permissões | 4 | Lab usa JWT; principal usará Supabase — mudança moderada |
| Gestão de motos | 4 | CRUD + status + fotos (Cloudinary) |
| Fluxo de locação | 7 | Máquina de estados, contratos, datas, multas |
| Documentos | 5 | Upload, validade CNH, Cloudinary |
| PIX único | 5 | Lab tem base; validar Sandbox |
| Cartão único | 5 | Idem |
| Cartão recorrente | 7 | Checkout + lifecycle + inadimplência |
| Assinaturas e renovações | 8 | Múltiplos payments, estados, edge cases |
| Webhooks | 6 | Lab tem código; integração + hardening |
| Idempotência | 5 | Modelado; falta testar sob carga |
| Reconciliação | 6 | Divergências, concorrência, observabilidade |
| Caução manual | 4 | CRUD estados + auditoria; sem gateway |
| Caução automática futura | 9 | Fora de escopo MVP |
| Deploy e produção | 6 | Render + Vercel + Supabase + migrations |
| **Projeto completo** | **7** | Domínio locação + financeiro + operação |

---

## 10. Trabalho restante (dias úteis, 1 dev + IA)

### Cenário otimista

| Fase | Dias |
|------|------|
| Correções do Asaas Lab | 3–4 |
| Adaptação ao domínio de locação | 8–10 |
| Pagamentos únicos | 3–4 |
| Recorrência | 4–5 |
| Webhooks e reconciliação | 3–4 |
| Caução manual | 3–4 |
| Testes | 4–5 |
| Segurança e observabilidade | 2–3 |
| Deploy e homologação | 3–4 |
| **Total** | **33–43** |

### Cenário realista

| Fase | Dias |
|------|------|
| Correções do Asaas Lab | 5–7 |
| Adaptação ao domínio de locação | 12–15 |
| Pagamentos únicos | 5–7 |
| Recorrência | 7–10 |
| Webhooks e reconciliação | 5–7 |
| Caução manual | 5–6 |
| Testes | 7–10 |
| Segurança e observabilidade | 4–5 |
| Deploy e homologação | 5–7 |
| **Total** | **55–74** |

### Cenário conservador

| Fase | Dias |
|------|------|
| Correções do Asaas Lab | 8–10 |
| Adaptação ao domínio de locação | 18–22 |
| Pagamentos únicos | 8–10 |
| Recorrência | 12–15 |
| Webhooks e reconciliação | 8–10 |
| Caução manual | 7–8 |
| Testes | 12–15 |
| Segurança e observabilidade | 6–8 |
| Deploy e homologação | 8–10 |
| **Total** | **87–108** |

---

## 11. Roadmap recomendado

### Gate 1 — Laboratório validado

- **Objetivo:** Fluxo financeiro funcional no Sandbox
- **Requisitos:** Conectar webhook; correlation ID; testes manuais PIX/cartão/assinatura documentados
- **Evidência de conclusão:** Checklist Sandbox assinado + webhooks PROCESSED no banco
- **Riscos:** API Key, túnel ngrok, eventos Asaas
- **Condição para avançar:** 3 fluxos confirmados via webhook (não só reconciliação)

### Gate 2 — Base do sistema

- **Objetivo:** Monorepo principal, Supabase Auth, Prisma, deploy dev
- **Requisitos:** Auth real, roles operacionais, CI básico
- **Evidência:** Login + health em staging
- **Riscos:** Migração auth JWT → Supabase
- **Condição:** Equipe acessa staging

### Gate 3 — Clientes e motos

- **Objetivo:** CRUD locatários e frota
- **Requisitos:** Customer estendido, fotos moto (Cloudinary)
- **Evidência:** CRUD E2E
- **Riscos:** Modelagem incompleta
- **Condição:** Dados mestres estáveis

### Gate 4 — Locações

- **Objetivo:** Contrato de locação com estados
- **Requisitos:** Máquina de estados, vínculo moto-cliente-período
- **Evidência:** Locação criada → PENDING_PAYMENT
- **Riscos:** Regras de negócio não documentadas
- **Condição:** Fluxo operacional sem pagamento

### Gate 5 — Pagamentos únicos

- **Objetivo:** PIX e cartão para locação
- **Requisitos:** Adaptar PaymentOrder ao domínio Rental
- **Evidência:** Pagamento confirmado atualiza locação
- **Riscos:** Webhook, callback
- **Condição:** 10 pagamentos Sandbox sem falha

### Gate 6 — Assinaturas

- **Objetivo:** Aluguel mensal recorrente
- **Requisitos:** Subscription vinculada à locação longa
- **Evidência:** 2+ renovações registradas
- **Riscos:** Inadimplência, cartão recusado
- **Condição:** Renovação automática observada

### Gate 7 — Caução manual

- **Objetivo:** Fluxo MVP sem Asaas
- **Requisitos:** Estados NOT_REQUIRED → REFUNDED/RETAINED, upload comprovante, auditoria
- **Evidência:** Ciclo completo simulado
- **Riscos:** Conferência manual, fraude
- **Condição:** Operador consegue ciclo completo

### Gate 8 — Testes de integração

- **Objetivo:** Suite automatizada financeira + locação
- **Requisitos:** Mock provider + casos webhook/reconciliação
- **Evidência:** CI verde
- **Riscos:** Flaky tests
- **Condição:** >70% caminhos críticos cobertos

### Gate 9 — Homologação

- **Objetivo:** UAT com cliente no Sandbox
- **Requisitos:** Roteiro de testes, rollback plan
- **Evidência:** Termo de homologação
- **Riscos:** Feedback tardio
- **Condição:** Zero bloqueadores abertos

### Gate 10 — Produção

- **Objetivo:** Go-live controlado
- **Requisitos:** Keys produção, monitoramento, runbook
- **Evidência:** Primeiro pagamento real (se aplicável) ou soft launch
- **Riscos:** Sandbox vs produção
- **Condição:** Gate 9 aprovado

---

## 12. Veredito

### Respostas diretas

1. **O laboratório está realmente funcional?** **Não.** Checkout pode ser criado; confirmação automática via webhook **não funciona** no estado atual.
2. **PIX está pronto?** **Não.** Criação sim; confirmação não.
3. **Cartão único está pronto?** **Não.** Mesma limitação.
4. **Recorrência está pronta?** **Não.** Checkout recorrente implementado; lifecycle incompleto.
5. **Renovações estão prontas?** **Não.** Código parcial; sem evidência de teste.
6. **Webhooks são confiáveis?** **Não.** Endpoint público não persiste nem processa.
7. **A integração pode ser copiada?** **Parcialmente.** ~70% do código financeiro é reaproveitável após correções.
8. **O que precisa ser refeito?** Integração webhook (controller), estornos, testes financeiros, correlation middleware, validação CPF, deploy strategy (cron).
9. **Dificuldade real do projeto?** **7/10** — domínio locação + recorrência + operação manual de caução.
10. **A equipe está pronta para começar?** **Sim, com ressalvas.** Podem iniciar base do sistema principal em paralelo, mas **não** devem integrar pagamentos antes do Gate 1.
11. **Principal risco?** **Webhook desconectado** — pagamentos confirmados no Asaas não refletem no sistema.
12. **Próximo passo técnico?** Unificar `AsaasWebhookController` para delegar a `WebhooksService.receive()` e validar fluxo PIX completo no Sandbox.

### Decisão

```text
GO COM RESTRIÇÕES — adaptar após correções específicas
```

**Justificativa:** O lab entrega arquitetura valiosa (schema, provider, services, frontend de operação) que reduz ~40% do risco de integração Asaas. Porém, o bloqueador de webhook invalida qualquer claim de "lab funcional". Corrigir isso + homologar Sandbox são pré-requisitos antes de adaptar ao sistema de locação.

---

## 13. Próximo passo recomendado

### Prioridade imediata (Asaas Lab — 1–2 dias)

1. Alterar `AsaasWebhookController` para chamar `WebhooksService.receive()`.
2. Registrar `CorrelationIdMiddleware` globalmente.
3. Configurar API Key Sandbox + ngrok + webhook no painel Asaas.
4. Executar roteiro manual:
   - Criar customer → sync → PIX checkout → pagar no Sandbox → verificar `WebhookEvent PROCESSED` + `Payment CONFIRMED`.
5. Documentar resultados (screenshots IDs, sem expor secrets).

### Em paralelo (sistema principal)

1. Iniciar Gate 2 (Supabase Auth, schema locação/motos).
2. **Não** copiar módulo financeiro até Gate 1 concluído.

### Correções adicionais antes de produção

- Implementar estornos (`POST /payments/{id}/refund` Asaas)
- Rate limiting no endpoint webhook
- Testes integração com MockPaymentProvider simulando sequência webhook
- Deploy API em Render (não Vercel) para cron de webhook/reconciliação
- Validação algorítmica CPF/CNPJ
- Remover JWT secret default

---

## Apêndice A — Validação API Asaas (docs oficiais)

Consultado: [Criar novo checkout](https://docs.asaas.com/reference/criar-novo-checkout)

| Campo lab | Doc oficial | Status |
|-----------|-------------|--------|
| `POST /v3/checkouts` | ✅ | Correto |
| `billingTypes: ['PIX']` / `['CREDIT_CARD']` | ✅ | Correto |
| `chargeTypes: ['DETACHED']` / `['RECURRENT']` | ✅ | Correto |
| `subscription.cycle: 'MONTHLY'` | ✅ | Correto para recorrente |
| Resposta `link` | ✅ `CheckoutSessionResponseDTO.link` | Correto |
| Header `access_token` | ✅ Padrão Asaas | Correto |
| Webhook header `asaas-access-token` | ✅ Documentado | Correto |

## Apêndice B — Evidências de código críticas

**Webhook desconectado** (`asaas-webhook.service.ts`):

```typescript
// TODO: Persistir payload.id (asaasEventId) no PostgreSQL com índice UNIQUE
// Próxima fase: prisma.webhookEvent.create({ data: { asaasEventId: eventId, ... } })
```

**Controller usa service errado**:

```typescript
// asaas-webhook.controller.ts
return this.asaasWebhookService.receive(token, payload);
```

**WebhooksService completo nunca invocado publicamente** — grep confirma única referência `receive` no controller acima.

---

*Relatório gerado por auditoria estática + execução de comandos npm. Nenhum código de produção foi modificado.*
