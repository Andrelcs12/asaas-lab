'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { MoneyDisplay } from '@/components/money-display';
import { ExternalIdField } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', id],
    queryFn: async () => (await api.get(`/payments/${id}`)).data,
  });

  const reconcile = useMutation({
    mutationFn: async () => (await api.post(`/payments/${id}/reconcile`)).data,
    onSuccess: () => {
      toast.success('Reconciliação concluída');
      qc.invalidateQueries({ queryKey: ['payment', id] });
    },
  });

  if (isLoading) return <p className="text-zinc-400">Carregando...</p>;

  return (
    <div>
      <PageHeader
        title="Detalhe do pagamento"
        action={isAdmin ? <Button onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>Reconciliar</Button> : undefined}
      />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{payment.customer?.name}</CardTitle>
          <MoneyDisplay value={Number(payment.value)} size="lg" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><span className="text-zinc-500">Status interno</span><div className="mt-1"><StatusBadge status={payment.internalStatus} /></div></div>
          <div><span className="text-zinc-500">Status Asaas</span><p>{payment.asaasStatus ?? '—'}</p></div>
          <div><span className="text-zinc-500">Vencimento</span><p>{formatDate(payment.dueDate)}</p></div>
          <div><span className="text-zinc-500">Confirmação</span><p>{formatDate(payment.confirmedDate)}</p></div>
          <div className="sm:col-span-2"><span className="text-zinc-500">ID Asaas</span><div className="mt-1"><ExternalIdField label="Payment" value={payment.asaasPaymentId} /></div></div>
        </CardContent>
      </Card>
    </div>
  );
}
