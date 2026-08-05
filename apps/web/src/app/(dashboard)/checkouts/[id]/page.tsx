'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { checkoutsService } from '@/features/checkouts/checkouts.service';
import { PageHeader } from '@/components/page-elements';
import { StatusBadge } from '@/components/status-badge';
import { ExternalIdField } from '@/components/external-id-field';
import { CopyButton } from '@/components/copy-button';
import { RoleGuard } from '@/components/role-guard';
import { MoneyDisplay } from '@/components/money-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function CheckoutDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: checkout, isLoading, refetch } = useQuery({
    queryKey: ['checkout', id],
    queryFn: async () => (await checkoutsService.getById(id)).data as Awaited<ReturnType<typeof checkoutsService.getById>>['data'] & {
      paymentOrder?: { customer?: { name: string; email: string }; product?: { name: string; price: number }; externalReference?: string };
      subscription?: { customer?: { name: string; email: string }; product?: { name: string; price: number } };
    },
  });

  const reconcile = async () => {
    try {
      await checkoutsService.reconcile(id);
      toast.success('Reconciliação executada');
      refetch();
    } catch {
      toast.error('Erro na reconciliação');
    }
  };

  if (isLoading) return <p className="text-zinc-500">Carregando...</p>;
  if (!checkout) return <p>Checkout não encontrado</p>;

  const order = checkout.paymentOrder;
  const sub = checkout.subscription;
  const customer = order?.customer ?? sub?.customer;
  const product = order?.product ?? sub?.product;

  return (
    <div>
      <PageHeader title="Detalhes do Checkout" description={`Checkout ${checkout.type.replace(/_/g, ' ')}`} />

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={checkout.status} />
            <StatusBadge status={checkout.type} />
          </div>

          {product && (
            <div>
              <p className="text-xs text-zinc-500">Produto</p>
              <p className="font-medium">{product.name}</p>
              <MoneyDisplay value={Number(product.price)} />
            </div>
          )}

          {customer && (
            <div>
              <p className="text-xs text-zinc-500">Cliente</p>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-zinc-500">{customer.email}</p>
            </div>
          )}

          <ExternalIdField label="ID interno" value={checkout.id} />
          <ExternalIdField label="ID Asaas Checkout" value={checkout.asaasCheckoutId} />

          {order?.externalReference && (
            <ExternalIdField label="External Reference" value={order.externalReference} />
          )}

          <p className="text-sm text-zinc-500">Criado em {formatDate(checkout.createdAt)}</p>

          <div className="flex flex-wrap gap-2">
            {checkout.checkoutUrl && (
              <>
                <Button asChild>
                  <a href={checkout.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Abrir Checkout do Asaas
                  </a>
                </Button>
                <CopyButton value={checkout.checkoutUrl} label="Copiar link" />
              </>
            )}
            <RoleGuard adminOnly>
              <Button variant="secondary" onClick={reconcile}>
                Reconciliar
              </Button>
            </RoleGuard>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
