'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { productsService } from '@/features/products/products.service';
import { PageHeader } from '@/components/page-elements';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';

export default function NewProductPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-red-300">
        Acesso negado. Apenas ADMIN pode criar produtos.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await productsService.create({
        name: form.get('name'),
        description: form.get('description'),
        type: form.get('type'),
        price: Number(form.get('price')),
        billingCycle: form.get('type') === 'SUBSCRIPTION' ? 'MONTHLY' : 'NONE',
      });
      toast.success('Produto criado');
      router.push('/products');
    } catch {
      toast.error('Erro ao criar produto');
    }
  };

  return (
    <div>
      <PageHeader title="Novo produto" description="Cadastre um produto para testes" />
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" required /></div>
            <div><Label htmlFor="description">Descrição</Label><Input id="description" name="description" required /></div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" required defaultValue="ONE_TIME">
                <option value="ONE_TIME">Pagamento único</option>
                <option value="SUBSCRIPTION">Assinatura mensal</option>
              </Select>
            </div>
            <div><Label htmlFor="price">Preço (R$)</Label><Input id="price" name="price" type="number" step="0.01" min="0.01" required /></div>
            <RoleGuard adminOnly>
              <Button type="submit">Salvar produto</Button>
            </RoleGuard>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
