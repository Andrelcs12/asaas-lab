'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { productsService } from '@/features/products/products.service';
import type { ProductDto } from '@asaas-lab/shared';
import { PageHeader } from '@/components/page-elements';
import { MoneyDisplay } from '@/components/money-display';
import { StatusBadge } from '@/components/status-badge';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await productsService.getById(id)).data,
  });

  const toggleActive = async () => {
    try {
      await productsService.update(id, { isActive: !product?.isActive });
      toast.success(product?.isActive ? 'Produto inativado' : 'Produto ativado');
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    } catch {
      toast.error('Erro ao atualizar produto');
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await productsService.update(id, {
        name: form.get('name'),
        description: form.get('description'),
        price: Number(form.get('price')),
      });
      toast.success('Produto atualizado');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  if (isLoading) return <p className="text-zinc-500">Carregando...</p>;
  if (!product) return <p>Produto não encontrado</p>;

  return (
    <div>
      <PageHeader
        title={product.name}
        description={product.description}
        action={
          <RoleGuard adminOnly>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancelar' : 'Editar'}
              </Button>
              <Button variant="secondary" onClick={toggleActive}>
                {product.isActive ? 'Inativar' : 'Ativar'}
              </Button>
            </div>
          </RoleGuard>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          {editing && isAdmin ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" defaultValue={product.name} required /></div>
              <div><Label htmlFor="description">Descrição</Label><Input id="description" name="description" defaultValue={product.description} required /></div>
              <div><Label htmlFor="price">Preço</Label><Input id="price" name="price" type="number" step="0.01" defaultValue={Number(product.price)} required /></div>
              <Button type="submit">Salvar</Button>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={product.type} />
                <StatusBadge status={product.isActive ? 'ACTIVE' : 'CANCELED'} />
              </div>
              <MoneyDisplay value={Number(product.price)} size="lg" />
              <p className="text-sm text-zinc-500">Ciclo: {product.billingCycle}</p>
              <p className="text-sm text-zinc-500">Criado em {formatDate(product.createdAt)}</p>
            </>
          )}
          <Button variant="secondary" onClick={() => router.push('/products')}>
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
