'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminService } from '@/features/admin/admin.service';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { data, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await adminService.settings()).data,
  });

  const reconcile = useMutation({
    mutationFn: async () => (await adminService.runReconciliation()).data,
    onSuccess: (result) => toast.success(`Reconciliação: ${result.divergencesFixed} corrigidas`),
  });

  return (
    <div>
      <PageHeader title="Configurações" description="Informações seguras do ambiente Sandbox" />
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Ambiente</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex justify-between"><span className="text-zinc-500">Ambiente</span><span>{data?.environment}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">URL Asaas</span><span className="font-mono text-xs">{data?.asaasBaseUrl}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Provider</span><span>{data?.provider}</span></div>
          <div className="flex justify-between items-center"><span className="text-zinc-500">Webhook</span><StatusBadge status={data?.webhookConfigured ? 'SYNCED' : 'PENDING'} /></div>
          <div className="flex justify-between items-center"><span className="text-zinc-500">Conexão</span><StatusBadge status={data?.connectionStatus === 'connected' ? 'ACTIVE' : 'FAILED'} /></div>
          <div className="flex justify-between"><span className="text-zinc-500">Última verificação</span><span>{formatDate(data?.lastCheckedAt)}</span></div>
          <p className="text-xs text-zinc-500">API Key e tokens nunca são exibidos nesta tela.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => refetch()}>Verificar conexão</Button>
            {isAdmin && <Button onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>Executar reconciliação</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
