'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/page-elements';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => (await api.get('/admin/audit')).data,
  });

  return (
    <div>
      <PageHeader title="Auditoria" description="Registro de ações financeiras e operacionais" />
      {isLoading ? (
        <p className="text-zinc-500 dark:text-zinc-400">Carregando...</p>
      ) : !data?.data?.length ? (
        <EmptyState title="Nenhum registro" />
      ) : (
        <div className="space-y-3">
          {data.data.map((log: { id: string; action: string; entityType: string; createdAt: string; actor?: { name: string }; correlationId?: string }) => (
            <Card key={log.id}>
              <CardContent className="p-5 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-zinc-900 dark:text-zinc-200">{log.action}</span>
                  <span className="text-zinc-500">{formatDate(log.createdAt)}</span>
                </div>
                <p className="text-zinc-400">{log.entityType} · {log.actor?.name ?? 'Sistema'}</p>
                {log.correlationId && <p className="text-xs text-zinc-600">correlation: {log.correlationId}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
