'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { subscriptionsService } from '@/features/subscriptions/subscriptions.service';
import { PageHeader, EmptyState } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { MoneyDisplay } from '@/components/money-display';
import { Card, CardContent } from '@/components/ui/card';

export default function SubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => (await subscriptionsService.list()).data,
  });

  return (
    <div>
      <PageHeader title="Assinaturas" description="Recorrências mensais controladas pelo Asaas" />
      {isLoading ? (
        <p className="text-zinc-500 dark:text-zinc-400">Carregando...</p>
      ) : !data?.data?.length ? (
        <EmptyState title="Nenhuma assinatura" />
      ) : (
        <div className="space-y-3">
          {data.data.map((sub: { id: string; description: string; status: string; amount: number; customer?: { name: string } }) => (
            <Card key={sub.id}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <Link href={`/subscriptions/${sub.id}`} className="font-medium hover:text-emerald-400">{sub.description}</Link>
                  <p className="text-sm text-zinc-500">{sub.customer?.name}</p>
                  <div className="mt-2"><StatusBadge status={sub.status} /></div>
                </div>
                <MoneyDisplay value={Number(sub.amount)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
