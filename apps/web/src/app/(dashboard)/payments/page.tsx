'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { MoneyDisplay } from '@/components/money-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

export default function PaymentsPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => (await api.get('/payments')).data,
  });

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        description="Cobranças confirmadas via webhook ou reconciliação"
        action={
          isAdmin ? (
            <Button asChild><Link href="/payments/new"><Plus className="h-4 w-4" />Nova cobrança</Link></Button>
          ) : undefined
        }
      />
      {isLoading ? (
        <p className="text-zinc-400">Carregando...</p>
      ) : !data?.data?.length ? (
        <EmptyState title="Nenhum pagamento" />
      ) : (
        <div className="space-y-3">
          {data.data.map((payment: { id: string; internalStatus: string; value: number; customer?: { name: string } }) => (
            <Card key={payment.id}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <Link href={`/payments/${payment.id}`} className="font-medium hover:text-emerald-400">
                    {payment.customer?.name ?? 'Cliente'}
                  </Link>
                  <div className="mt-1"><StatusBadge status={payment.internalStatus} /></div>
                </div>
                <MoneyDisplay value={Number(payment.value)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
