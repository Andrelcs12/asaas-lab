# Integração com Sistema de Aluguel de Motos

## Mapeamento Lab → Produção

| Lab | Sistema de Aluguel |
| --- | ------------------ |
| Customer | Cliente locatário |
| Product | Plano/modalidade de cobrança |
| PaymentOrder | Intenção de pagamento da locação |
| Checkout | Link enviado ao cliente |
| Payment | Cobrança da locação |
| Subscription | Recorrência mensal da locação |
| WebhookEvent | Evento financeiro |
| AuditLog | Auditoria operacional |

## Reutilizável (~65%)

- `AsaasHttpClient` + `AsaasPaymentProvider`
- Módulos: customers, checkouts, payments, subscriptions, webhooks, reconciliation
- `packages/shared` (mappers, enums, externalReference)
- Padrão webhook: persistir → fila → processar → idempotência
- Testes unitários de mapeamento

## Adaptar no projeto principal

- Relacionar `PaymentOrder` com `Rental` / contrato
- Valor mensal dinâmico da locação
- Datas início/fim, encerramento antecipado
- Inadimplência → bloqueio operacional da moto
- Cancelar recorrência ao finalizar locação

## Caução (fora do Asaas)

Registro manual no MVP: valor previsto, recebido, forma, data, responsável, retenção, devolução, motivo, status.
