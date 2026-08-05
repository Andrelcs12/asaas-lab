'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

export default function WebhookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ['webhook', id],
    queryFn: async () => (await api.get(`/admin/webhooks/${id}`)).data,
  });

  const reprocess = useMutation({
    mutationFn: async () => (await api.post(`/admin/webhooks/${id}/reprocess`)).data,
    onSuccess: () => {
      toast.success('Reprocessamento iniciado');
      qc.invalidateQueries({ queryKey: ['webhook', id] });
    },
  });

  if (isLoading) return <p className="text-zinc-400">Carregando...</p>;

  return (
    <div>
      <PageHeader
        title={event.eventType}
        action={isAdmin ? <Button onClick={() => reprocess.mutate()}>Reprocessar</Button> : undefined}
      />
      <Card>
        <CardHeader className="flex-row justify-between"><CardTitle>Evento</CardTitle><StatusBadge status={event.status} /></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p><span className="text-zinc-500">Recebido:</span> {formatDate(event.receivedAt)}</p>
          <p><span className="text-zinc-500">Processado:</span> {formatDate(event.processedAt)}</p>
          {event.lastError && <p className="text-red-400">{event.lastError}</p>}
          <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-300">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
