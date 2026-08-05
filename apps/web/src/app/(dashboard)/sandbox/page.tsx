'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-elements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SandboxPage() {
  const health = useQuery({ queryKey: ['health-asaas'], queryFn: async () => (await api.get('/health/asaas')).data });
  const webhooks = useQuery({ queryKey: ['webhooks-latest'], queryFn: async () => (await api.get('/admin/webhooks?limit=1')).data });

  return (
    <div>
      <PageHeader title="Sandbox Tools" description="Ferramentas de desenvolvimento — somente ambiente local" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Conexão Asaas</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Status: {health.data?.status}</p>
            <p>Configurado: {health.data?.configured ? 'Sim' : 'Não — preencha ASAAS_API_KEY no .env'}</p>
            <p className="text-zinc-500">Use credenciais do Sandbox em docs.asaas.com</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Último webhook</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs">
              {JSON.stringify(webhooks.data?.data?.[0] ?? { message: 'Nenhum webhook ainda' }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
