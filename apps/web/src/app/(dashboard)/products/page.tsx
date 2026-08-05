'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { productsService } from '@/features/products/products.service';
import type { ProductDto } from '@asaas-lab/shared';
import { PageHeader } from '@/components/page-elements';
import { MoneyDisplay } from '@/components/money-display';
import { StatusBadge } from '@/components/status-badge';
import { RoleGuard } from '@/components/role-guard';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ProductsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await productsService.list()).data,
  });

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos para simulação de pagamentos"
        action={
          <RoleGuard adminOnly>
            <Button asChild>
              <Link href="/products/new">
                <Plus className="h-4 w-4" />
                Novo produto
              </Link>
            </Button>
          </RoleGuard>
        }
      />

      {isLoading ? (
        <p className="text-zinc-500">Carregando...</p>
      ) : !data?.data?.length ? (
        <EmptyState title="Nenhum produto cadastrado" description="Execute o seed ou crie um produto." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="transition-colors hover:border-emerald-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{product.name}</h3>
                    <StatusBadge status={product.type} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{product.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <MoneyDisplay value={Number(product.price)} />
                    <StatusBadge status={product.isActive ? 'ACTIVE' : 'CANCELED'} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
