'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/features/admin/admin.service';
import { PageHeader, EmptyState } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function WebhooksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => (await adminService.listWebhooks()).data,
  });

  return (
    <div>
      <PageHeader title="Webhooks" description="Eventos recebidos do Asaas — fila persistida em PostgreSQL" />
      {isLoading ? (
        <p className="text-zinc-500 dark:text-zinc-400">Carregando...</p>
      ) : !data?.data?.length ? (
        <EmptyState title="Nenhum webhook" />
      ) : (
        <div className="space-y-3">
          {data.data.map((event: { id: string; eventType: string; status: string; receivedAt: string; attempts: number }) => (
            <Card key={event.id}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <Link href={`/webhooks/${event.id}`} className="font-medium hover:text-emerald-400">{event.eventType}</Link>
                  <p className="text-xs text-zinc-500">{formatDate(event.receivedAt)} · {event.attempts} tentativas</p>
                </div>
                <StatusBadge status={event.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
