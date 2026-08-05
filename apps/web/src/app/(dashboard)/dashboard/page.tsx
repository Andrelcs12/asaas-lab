'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardStats } from '@asaas-lab/shared';
import { MetricCard, PageHeader } from '@/components/page-elements';
import { MoneyDisplay } from '@/components/money-display';
import { StatusBadge } from '@/components/status-badge';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardStats>('/admin/dashboard')).data,
  });

  const runReconciliation = async () => {
    try {
      await api.post('/admin/reconciliation/run');
      toast.success('Reconciliação iniciada');
      refetch();
    } catch {
      toast.error('Erro na reconciliação');
    }
  };

  if (isLoading) return <div className="text-zinc-500 dark:text-zinc-400">Carregando dashboard...</div>;

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral do laboratório de pagamentos" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Clientes" value={data?.customersCount ?? 0} />
        <MetricCard title="Produtos" value={data?.productsCount ?? 0} />
        <MetricCard title="Checkouts" value={data?.checkoutsCount ?? 0} />
        <MetricCard title="Pagamentos pendentes" value={data?.pendingPayments ?? 0} />
        <MetricCard title="Pagamentos confirmados" value={data?.confirmedPayments ?? 0} />
        <MetricCard title="Pagamentos vencidos" value={data?.overduePayments ?? 0} />
        <MetricCard title="Assinaturas ativas" value={data?.activeSubscriptions ?? 0} />
        <MetricCard title="Assinaturas pausadas" value={data?.pausedSubscriptions ?? 0} />
        <MetricCard title="Assinaturas canceladas" value={data?.canceledSubscriptions ?? 0} />
        <MetricCard title="Renovações" value={data?.renewals ?? 0} />
        <MetricCard title="Webhooks pendentes" value={data?.pendingWebhooks ?? 0} />
        <MetricCard title="Webhooks com falha" value={data?.failedWebhooks ?? 0} />
        <MetricCard title="Valor confirmado" value={<MoneyDisplay value={data?.confirmedValue ?? 0} size="lg" />} />
        <MetricCard title="Valor pendente" value={<MoneyDisplay value={data?.pendingValue ?? 0} size="lg" />} />
      </div>

      <RoleGuard adminOnly>
        <Card className="mt-8">
          <CardHeader><CardTitle>Ações rápidas</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><Link href="/customers/new"><Plus className="h-4 w-4" />Novo cliente</Link></Button>
            <Button asChild variant="secondary"><Link href="/products/new"><Plus className="h-4 w-4" />Novo produto</Link></Button>
            <Button asChild variant="secondary"><Link href="/checkout/new"><Plus className="h-4 w-4" />Criar pagamento</Link></Button>
            <Button asChild variant="secondary"><Link href="/webhooks">Visualizar webhooks</Link></Button>
            <Button variant="secondary" onClick={runReconciliation}><RefreshCw className="h-4 w-4" />Executar reconciliação</Button>
          </CardContent>
        </Card>
      </RoleGuard>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pagamentos recentes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!data?.recentPayments?.length ? (
              <p className="text-sm text-zinc-500">Nenhum pagamento.</p>
            ) : (
              data.recentPayments.map((p) => (
                <Link key={p.id} href={`/payments/${p.id}`} className="block rounded-xl border border-zinc-200 p-3 hover:border-emerald-400 dark:border-zinc-800 dark:hover:border-emerald-800">
                  <div className="flex justify-between">
                    <span className="text-sm">{(p as { customer?: { name: string } }).customer?.name ?? p.id.slice(0, 8)}</span>
                    <StatusBadge status={p.internalStatus} />
                  </div>
                  <MoneyDisplay value={Number(p.value)} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Últimos webhooks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!data?.recentEvents?.length ? (
              <p className="text-sm text-zinc-500">Nenhum evento.</p>
            ) : (
              data.recentEvents.map((event) => (
                <Link key={event.id} href={`/webhooks/${event.id}`} className="flex justify-between rounded-xl border border-zinc-200 p-3 hover:border-emerald-400 dark:border-zinc-800 dark:hover:border-emerald-800">
                  <div>
                    <p className="text-sm font-medium">{event.eventType}</p>
                    <p className="text-xs text-zinc-500">{formatDate(event.receivedAt)}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
