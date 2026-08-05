'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, QrCode, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { ProductDto } from '@asaas-lab/shared';
import { PageHeader } from '@/components/page-elements';
import { MoneyDisplay } from '@/components/money-display';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';

type Flow = 'pix' | 'credit-card' | 'subscription';

export default function NewCheckoutPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [flow, setFlow] = useState<Flow>('pix');
  const [productId, setProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ checkoutUrl: string; checkoutId?: string; externalReference: string } | null>(null);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<{ data: ProductDto[] }>('/products?isActive=true')).data,
  });

  const selectedProduct = useMemo(
    () => products?.data?.find((p) => p.id === productId),
    [products, productId],
  );

  const filteredProducts = useMemo(() => {
    if (!products?.data) return [];
    if (flow === 'subscription') return products.data.filter((p) => p.type === 'SUBSCRIPTION');
    return products.data.filter((p) => p.type === 'ONE_TIME');
  }, [products, flow]);

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-red-300">
        Acesso negado. Apenas ADMIN pode criar checkouts.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Selecione um produto');
      return;
    }

    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const dueDate = String(form.get('dueDate') || form.get('startDate'));
    const body = {
      customerId,
      productId,
      dueDate,
      startDate: dueDate,
      idempotencyKey: `${Date.now()}-${customerId}-${productId}`,
    };

    try {
      let response;
      if (flow === 'pix') {
        response = await api.post('/payment-orders/pix', body);
      } else if (flow === 'credit-card') {
        response = await api.post('/payment-orders/credit-card', body);
      } else {
        response = await api.post('/subscriptions/monthly', body);
      }

      setResult(response.data);
      toast.success('Checkout criado no Asaas');
    } catch {
      toast.error('Erro ao criar checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const flows = [
    { id: 'pix' as Flow, title: 'Compra única', subtitle: 'Pagamento por PIX', icon: QrCode },
    { id: 'credit-card' as Flow, title: 'Compra única', subtitle: 'Cartão de crédito', icon: CreditCard },
    { id: 'subscription' as Flow, title: 'Assinatura', subtitle: 'Cartão recorrente — cobrança mensal', icon: Repeat },
  ];

  return (
    <div>
      <PageHeader title="Novo Checkout" description="Cria Checkout hospedado no Asaas — cartão nunca é capturado aqui" />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {flows.map(({ id, title, subtitle, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setFlow(id); setProductId(''); setResult(null); }}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              flow === id
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
            }`}
          >
            <Icon className="mb-2 h-5 w-5 text-emerald-600" />
            <p className="font-medium">{title}</p>
            <p className="text-sm text-zinc-500">{subtitle}</p>
          </button>
        ))}
      </div>

      {result ? (
        <Card>
          <CardHeader><CardTitle>Checkout criado</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">External ref: {result.externalReference}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={result.checkoutUrl} target="_blank" rel="noopener noreferrer">
                  Abrir Checkout do Asaas
                </a>
              </Button>
              {result.checkoutId && (
                <Button variant="secondary" onClick={() => router.push(`/checkouts/${result.checkoutId}`)}>
                  Ver detalhes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customerId">Cliente</Label>
                <Select id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {customers?.data?.map((c: { id: string; name: string; syncStatus: string }) => (
                    <option key={c.id} value={c.id} disabled={c.syncStatus !== 'SYNCED'}>
                      {c.name} {c.syncStatus !== 'SYNCED' ? '(não sincronizado)' : ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="productId">Produto</Label>
                <Select id="productId" value={productId} onChange={(e) => setProductId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2)}</option>
                  ))}
                </Select>
              </div>

              {selectedProduct && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-sm text-zinc-500">{selectedProduct.description}</p>
                  <MoneyDisplay value={Number(selectedProduct.price)} size="lg" />
                </div>
              )}

              {flow === 'subscription' ? (
                <div>
                  <Label htmlFor="startDate">Data inicial da assinatura</Label>
                  <Input id="startDate" name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
              ) : (
                <div>
                  <Label htmlFor="dueDate">Vencimento</Label>
                  <Input id="dueDate" name="dueDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
              )}

              <RoleGuard adminOnly>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Criando...' : 'Criar Checkout no Asaas'}
                </Button>
              </RoleGuard>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
