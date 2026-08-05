'use client';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { ExternalIdField } from '@/components/external-id-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

export default function SandboxPage() {
  const { data, refetch } = useQuery({
    queryKey: ['sandbox'],
    queryFn: async () => (await api.get('/admin/sandbox')).data,
  });

  const runReconciliation = async () => {
    try {
      await api.post('/admin/reconciliation/run');
      toast.success('Reconciliação executada');
      refetch();
    } catch {
      toast.error('Erro na reconciliação');
    }
  };

  return (
    <div>
      <PageHeader title="Sandbox Tools" description="Ferramentas de desenvolvimento — somente ADMIN em ambiente local" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ambiente</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Ambiente: <strong>{data?.environment}</strong></p>
            <p>URL base: <code className="text-xs">{data?.asaasBaseUrl}</code></p>
            <p>Webhook configurado: {data?.webhookConfigured ? 'Sim' : 'Não'}</p>
            {data?.webhookUrl && <p>Webhook URL: <code className="text-xs">{data.webhookUrl}</code></p>}
            <p>Conexão: <StatusBadge status={data?.connectionStatus === 'connected' ? 'ACTIVE' : 'FAILED'} /></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runReconciliation}>Executar reconciliação geral</Button>
            <div>
              <Label>Consultar pagamento (ID Asaas)</Label>
              <form
                className="mt-2 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const id = new FormData(e.currentTarget).get('paymentId');
                  toast.info(`Consulte GET /payments e reconcilie pelo ID local vinculado a ${id}`);
                }}
              >
                <Input name="paymentId" placeholder="pay_..." />
                <Button type="submit" variant="secondary">Consultar</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Últimos Checkouts</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs dark:bg-zinc-900">
              {JSON.stringify(data?.lastCheckouts ?? [], null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Últimos webhooks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data?.lastWebhooks?.map((w: { id: string; eventType: string; receivedAt: string }) => (
              <div key={w.id} className="text-sm">
                <p>{w.eventType}</p>
                <p className="text-xs text-zinc-500">{formatDate(w.receivedAt)}</p>
              </div>
            )) ?? <p className="text-sm text-zinc-500">Nenhum</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Últimos clientes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data?.lastCustomers?.map((c: { id: string; name: string; asaasCustomerId?: string }) => (
              <div key={c.id}>
                <p className="text-sm font-medium">{c.name}</p>
                <ExternalIdField label="Asaas" value={c.asaasCustomerId} />
              </div>
            )) ?? <p className="text-sm text-zinc-500">Nenhum</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
