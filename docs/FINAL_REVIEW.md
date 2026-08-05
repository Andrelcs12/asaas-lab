# Revisão Final — Asaas Payment Lab

**Data:** 5 de agosto de 2026  
**Veredito:** `GO COM RESTRIÇÕES`

## Problemas encontrados e correções

| Problema | Correção |
| -------- | -------- |
| DTOs inline nos controllers | Extraídos para `dto/` por módulo |
| Frontend acoplado ao axios | Camada `features/*/service.ts` |
| Webhook sem `IGNORED` | Eventos desconhecidos marcados `IGNORED` |
| Regressão de status de pagamento | `shouldAdvancePaymentStatus` no shared |
| Estorno ausente | `POST /payments/:id/refund` |
| Código morto `AsaasWebhookService` | Removido |
| Produto parcelado inexistente | Seed com produto inativo + documentação |

## Comandos

```bash
docker compose down -v && docker compose up -d
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

- API: http://localhost:4000 — Swagger: `/docs`
- Web: http://localhost:3000
- Admin: `admin@lab.local` / `Lab@123456`
- Viewer: `viewer@lab.local` / `Lab@123456`

## Pendências

1. Homologação Sandbox real (requer API Key + webhook público)
2. Deploy API na Vercel — cron interno incompatível com serverless puro; recomendado Railway/Render/Fly.io
3. Rate limiting login/checkout
4. Renovação mensal — aguardar ciclo real no Sandbox

## Respostas rápidas

1. PIX — código pronto, Sandbox pendente  
2. Cartão — código pronto, Sandbox pendente  
3. Parcelamento — não suportado no Checkout hospedado  
4. Assinatura — código pronto, Sandbox pendente  
5. Renovação — VALIDADO COM MOCK  
6. Webhooks — confiáveis com precedência de estados  
7. Cancelamento — implementado  
8. Estorno — implementado (teste admin)  
9. Deploy — API persistente recomendada fora de Vercel serverless  
10. Reutilização aluguel — ~65%  
11. Maior risco — deploy + validação Sandbox real  
12. Próximo passo — teste Customer no Sandbox (passo 1)
