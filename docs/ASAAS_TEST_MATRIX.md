# Matriz de Testes — Asaas Payment Lab

| Fluxo | Implementado | Mock | Local | Sandbox | Resultado | Evidência |
| ----- | -----------: | ---: | ----: | ------: | --------- | --------- |
| Login ADMIN | Sim | — | Pendente | — | IMPLEMENTADO | `POST /auth/login` |
| Login VIEWER | Sim | — | Pendente | — | IMPLEMENTADO | RolesGuard |
| Criar customer local | Sim | — | Pendente | — | IMPLEMENTADO | `POST /customers` |
| Sync customer Asaas | Sim | Sim | Pendente | Pendente | IMPLEMENTADO SEM TESTES SANDBOX | `POST /customers/:id/sync` |
| Checkout PIX | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | `POST /payment-orders/pix` |
| Pagamento PIX | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | Webhook + reconciliação |
| Checkout cartão | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | `POST /payment-orders/credit-card` |
| Cartão aprovado/recusado | Sim | Parcial | Pendente | Pendente | IMPLEMENTADO SEM TESTES SANDBOX | Sandbox Asaas |
| Parcelamento | Não | — | — | Bloqueado | NÃO IMPLEMENTADO | Checkout hospedado sem `installmentCount` |
| Assinatura mensal | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | `POST /subscriptions/monthly` |
| Renovação | Sim | Sim | Pendente | Bloqueado | VALIDADO COM MOCK | Cron webhook |
| Inativação assinatura | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | `POST /subscriptions/:id/pause` |
| Reativação | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | `POST /subscriptions/:id/resume` |
| Cancelamento | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | `POST /subscriptions/:id/cancel` |
| Estorno integral/parcial | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | `POST /payments/:id/refund` |
| Webhook duplicado | Sim | — | Pendente | Pendente | IMPLEMENTADO | `asaasEventId` UNIQUE |
| Webhook inválido (token) | Sim | — | Pendente | — | IMPLEMENTADO | 401 sem persistir |
| Evento desconhecido | Sim | — | Pendente | — | IMPLEMENTADO | Status `IGNORED` |
| Reconciliação manual/auto | Sim | Sim | Pendente | Pendente | IMPLEMENTADO | Cron 10min + endpoints |
| Deploy Vercel API | Parcial | — | — | Bloqueado | BLOQUEADO POR CONFIGURAÇÃO | Cron + Fastify persistente |

## Como testar no Sandbox

1. Configure `.env` com `ASAAS_API_KEY` e `ASAAS_WEBHOOK_AUTH_TOKEN`
2. Exponha webhook via ngrok: `https://<id>.ngrok.io/webhooks/asaas`
3. Siga `docs/ASAAS_SANDBOX_VALIDATION.md`
