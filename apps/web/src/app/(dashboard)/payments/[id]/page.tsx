'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentsService } from '@/features/payments/payments.service';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { MoneyDisplay } from '@/components/money-display';
import { ExternalIdField } from '@/components/external-id-field';
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
    queryFn: async () => (await paymentsService.getById(id)).data as Awaited<ReturnType<typeof paymentsService.getById>>['data'] & {
      customer?: { name: string };
    },
  });

  const reconcile = useMutation({
    mutationFn: async () => (await paymentsService.reconcile(id)).data,
    onSuccess: () => {
      toast.success('Reconciliação concluída');
      qc.invalidateQueries({ queryKey: ['payment', id] });
    },
  });

  const refund = useMutation({
    mutationFn: async () => (await paymentsService.refund(id)).data,
    onSuccess: () => {
      toast.success('Estorno solicitado');
      qc.invalidateQueries({ queryKey: ['payment', id] });
    },
    onError: () => toast.error('Erro ao estornar pagamento'),
  });

  if (isLoading) return <p className="text-zinc-500 dark:text-zinc-400">Carregando...</p>;
  if (!payment) return <p className="text-zinc-500 dark:text-zinc-400">Pagamento não encontrado.</p>;

  return (
    <div>
      <PageHeader
        title="Detalhe do pagamento"
        action={
          isAdmin ? (
            <div className="flex gap-2">
              <Button onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>Reconciliar</Button>
              <Button variant="destructive" onClick={() => refund.mutate()} disabled={refund.isPending}>Estornar</Button>
            </div>
          ) : undefined
        }
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
