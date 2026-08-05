'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { checkoutsService } from '@/features/checkouts/checkouts.service';
import type { CheckoutDto } from '@asaas-lab/shared';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function CheckoutsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['checkouts'],
    queryFn: async () => (await checkoutsService.list()).data,
  });

  return (
    <div>
      <PageHeader title="Checkouts" description="Todos os Checkouts hospedados criados no Asaas" />

      {isLoading ? (
        <p className="text-zinc-500">Carregando...</p>
      ) : !data?.data?.length ? (
        <EmptyState title="Nenhum checkout" description="Crie um checkout em Novo Checkout." />
      ) : (
        <div className="space-y-3">
          {data.data.map((checkout) => (
            <Link key={checkout.id} href={`/checkouts/${checkout.id}`}>
              <Card className="transition-colors hover:border-emerald-800">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{checkout.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-zinc-500">{formatDate(checkout.createdAt)}</p>
                  </div>
                  <StatusBadge status={checkout.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
