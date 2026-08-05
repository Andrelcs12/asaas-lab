'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-elements';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label, Select, Textarea } from '@/components/ui/input';

export default function NewPaymentPage() {
  const [type, setType] = useState<'pix' | 'credit-card' | 'subscription'>('pix');
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      customerId: form.get('customerId'),
      description: form.get('description'),
      amount: Number(form.get('amount')),
      dueDate: form.get('dueDate'),
      startDate: form.get('startDate'),
      internalNote: form.get('internalNote'),
      idempotencyKey: `${Date.now()}-${form.get('customerId')}`,
    };

    try {
      let result;
      if (type === 'pix') {
        result = await api.post('/payment-orders/pix', body);
      } else if (type === 'credit-card') {
        result = await api.post('/payment-orders/credit-card', body);
      } else {
        result = await api.post('/subscriptions/monthly', body);
      }
      toast.success('Checkout criado');
      window.open(result.data.checkoutUrl, '_blank');
    } catch {
      toast.error('Erro ao criar checkout');
    }
  };

  return (
    <div>
      <PageHeader title="Nova cobrança" description="Gera Checkout hospedado do Asaas — nunca capture cartão aqui" />
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="pix">PIX — pagamento único</option>
                <option value="credit-card">Cartão — pagamento único</option>
                <option value="subscription">Cartão — assinatura mensal</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="customerId">Cliente</Label>
              <Select id="customerId" name="customerId" required>
                <option value="">Selecione...</option>
                {customers?.data?.map((c: { id: string; name: string; syncStatus: string }) => (
                  <option key={c.id} value={c.id} disabled={c.syncStatus !== 'SYNCED'}>
                    {c.name} {c.syncStatus !== 'SYNCED' ? '(não sincronizado)' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div><Label htmlFor="description">Descrição</Label><Input id="description" name="description" required /></div>
            <div><Label htmlFor="amount">Valor (R$)</Label><Input id="amount" name="amount" type="number" step="0.01" min="0.01" required /></div>
            {type === 'subscription' ? (
              <div><Label htmlFor="startDate">Data inicial</Label><Input id="startDate" name="startDate" type="date" required /></div>
            ) : (
              <div><Label htmlFor="dueDate">Vencimento</Label><Input id="dueDate" name="dueDate" type="date" required /></div>
            )}
            <div><Label htmlFor="internalNote">Observação interna</Label><Textarea id="internalNote" name="internalNote" /></div>
            <Button type="submit">Gerar Checkout</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
