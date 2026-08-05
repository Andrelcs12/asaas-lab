'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subscriptionsService } from '@/features/subscriptions/subscriptions.service';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { MoneyDisplay } from '@/components/money-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState('');

  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription', id],
    queryFn: async () => (await subscriptionsService.getById(id)).data as Awaited<ReturnType<typeof subscriptionsService.getById>>['data'] & {
      customer?: { name: string };
    },
  });

  const pause = useMutation({
    mutationFn: async () => (await subscriptionsService.pause(id)).data,
    onSuccess: () => { toast.success('Assinatura pausada'); qc.invalidateQueries({ queryKey: ['subscription', id] }); },
  });
  const resume = useMutation({
    mutationFn: async () => (await subscriptionsService.resume(id)).data,
    onSuccess: () => { toast.success('Assinatura reativada'); qc.invalidateQueries({ queryKey: ['subscription', id] }); },
  });
  const cancel = useMutation({
    mutationFn: async () => (await subscriptionsService.cancel(id, cancelReason)).data,
    onSuccess: () => { toast.success('Assinatura cancelada'); qc.invalidateQueries({ queryKey: ['subscription', id] }); },
  });
  const reconcile = useMutation({
    mutationFn: async () => (await subscriptionsService.reconcile(id)).data,
    onSuccess: () => { toast.success('Reconciliação concluída'); qc.invalidateQueries({ queryKey: ['subscription', id] }); },
  });

  if (isLoading) return <p className="text-zinc-500 dark:text-zinc-400">Carregando...</p>;
  if (!sub) return <p className="text-zinc-500 dark:text-zinc-400">Assinatura não encontrada.</p>;

  return (
    <div>
      <PageHeader title={sub.description} description={sub.customer?.name} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Status</span><StatusBadge status={sub.status} /></div>
            <div className="flex justify-between"><span className="text-zinc-500">Valor mensal</span><MoneyDisplay value={Number(sub.amount)} /></div>
            <div className="flex justify-between"><span className="text-zinc-500">Próxima cobrança</span><span>{formatDate(sub.nextDueDate)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Asaas status</span><span>{sub.asaasStatus ?? '—'}</span></div>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-zinc-500">Pausa usa status INACTIVE na API Asaas.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => pause.mutate()} disabled={sub.status !== 'ACTIVE'}>Pausar</Button>
                <Button variant="secondary" onClick={() => resume.mutate()} disabled={sub.status !== 'PAUSED'}>Reativar</Button>
                <Button variant="secondary" onClick={() => reconcile.mutate()}>Reconciliar</Button>
              </div>
              <div className="space-y-2 border-t border-zinc-800 pt-4">
                <Label>Motivo do cancelamento</Label>
                <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancelReason.length < 3}>
                  Cancelar definitivamente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
