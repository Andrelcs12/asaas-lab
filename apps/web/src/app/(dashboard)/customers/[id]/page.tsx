'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { ExternalIdField } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get(`/customers/${id}`)).data,
  });

  const syncMutation = useMutation({
    mutationFn: async () => (await api.post(`/customers/${id}/sync`)).data,
    onSuccess: () => {
      toast.success('Sincronização concluída');
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
    onError: () => toast.error('Falha na sincronização'),
  });

  if (isLoading) return <p className="text-zinc-400">Carregando...</p>;
  if (!customer) return <p className="text-zinc-400">Cliente não encontrado.</p>;

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.email}
        action={
          isAdmin ? (
            <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <RefreshCw className="h-4 w-4" />
              Sincronizar
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Dados</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">CPF/CNPJ</span><span>{customer.cpfCnpj}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Telefone</span><span>{customer.phone ?? '—'}</span></div>
            <div className="flex justify-between items-center"><span className="text-zinc-500">Sync</span><StatusBadge status={customer.syncStatus} /></div>
            <div><span className="text-zinc-500">ID Asaas</span><div className="mt-1"><ExternalIdField label="Asaas" value={customer.asaasCustomerId} /></div></div>
            {customer.lastSyncError && <p className="text-red-400">{customer.lastSyncError}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pagamentos recentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {customer.payments?.length ? customer.payments.map((p: { id: string; internalStatus: string; value: number }) => (
              <div key={p.id} className="flex justify-between rounded-lg bg-zinc-950 p-3">
                <StatusBadge status={p.internalStatus} />
                <span className="font-mono text-emerald-400">R$ {Number(p.value).toFixed(2)}</span>
              </div>
            )) : <p className="text-zinc-500">Nenhum pagamento.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
