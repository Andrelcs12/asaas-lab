'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { customersService } from '@/features/customers/customers.service';
import type { CustomerDto, PaginatedResponse } from '@/features/customers/types';
import { PageHeader, EmptyState } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

export default function CustomersPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await customersService.list()).data,
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Clientes locais sincronizados com o Asaas"
        action={
          isAdmin ? (
            <Button asChild>
              <Link href="/customers/new">
                <Plus className="h-4 w-4" />
                Novo cliente
              </Link>
            </Button>
          ) : undefined
        }
      />
      {isLoading ? (
        <p className="text-zinc-500 dark:text-zinc-400">Carregando...</p>
      ) : !data?.data.length ? (
        <EmptyState title="Nenhum cliente" description="Cadastre o primeiro cliente do laboratório." />
      ) : (
        <div className="space-y-3">
          {data.data.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <Link href={`/customers/${customer.id}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-zinc-100 dark:hover:text-emerald-400">
                    {customer.name}
                  </Link>
                  <p className="text-sm text-zinc-500">{customer.email}</p>
                </div>
                <StatusBadge status={customer.syncStatus} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
