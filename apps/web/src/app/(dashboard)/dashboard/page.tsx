'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardStats } from '@asaas-lab/shared';
import { MetricCard, PageHeader } from '@/components/page-elements';
import { MoneyDisplay } from '@/components/money-display';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardStats>('/admin/dashboard')).data,
  });

  if (isLoading) return <div className="text-zinc-400">Carregando dashboard...</div>;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do laboratório de pagamentos"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Clientes" value={data?.customersCount ?? 0} />
        <MetricCard title="Pagamentos pendentes" value={data?.pendingPayments ?? 0} />
        <MetricCard title="Pagamentos confirmados" value={data?.confirmedPayments ?? 0} />
        <MetricCard title="Pagamentos vencidos" value={data?.overduePayments ?? 0} />
        <MetricCard title="Assinaturas ativas" value={data?.activeSubscriptions ?? 0} />
        <MetricCard title="Assinaturas pausadas" value={data?.pausedSubscriptions ?? 0} />
        <MetricCard title="Assinaturas canceladas" value={data?.canceledSubscriptions ?? 0} />
        <MetricCard title="Webhooks com falha" value={data?.failedWebhooks ?? 0} />
        <MetricCard
          title="Valor confirmado"
          value={<MoneyDisplay value={data?.confirmedValue ?? 0} size="lg" />}
        />
        <MetricCard
          title="Valor pendente"
          value={<MoneyDisplay value={data?.pendingValue ?? 0} size="lg" />}
        />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Eventos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recentEvents?.length ? (
            <p className="text-sm text-zinc-500">Nenhum evento recente.</p>
          ) : (
            <div className="space-y-3">
              {data.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div>
                    <p className="font-medium text-zinc-200">{event.eventType}</p>
                    <p className="text-xs text-zinc-500">{formatDate(event.receivedAt)}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
