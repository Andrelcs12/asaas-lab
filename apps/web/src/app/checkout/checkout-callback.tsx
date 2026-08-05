'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { checkoutsService } from '@/features/checkouts/checkouts.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { ThemeToggle } from '@/components/theme-toggle';

export default function CheckoutCallbackPage({ variant }: { variant: 'success' | 'pending' | 'canceled' | 'error' }) {
  const params = useSearchParams();
  const ref = params.get('ref');
  const [status, setStatus] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!ref || variant === 'canceled' || variant === 'error') return;

    const poll = async () => {
      try {
        const response = await checkoutsService.list(1, 100);
        type CheckoutWithOrder = { paymentOrder?: { externalReference?: string; status?: string } };
        const found = (response.data.data as CheckoutWithOrder[]).find(
          (c) => c.paymentOrder?.externalReference === ref,
        );
        if (found?.paymentOrder?.status === 'CONFIRMED') {
          setStatus('CONFIRMED');
          return;
        }
      } catch {}
      if (attempts < 12) setAttempts((a) => a + 1);
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [ref, variant, attempts]);

  const titles = {
    success: 'Retorno do Checkout',
    pending: 'Pagamento pendente',
    canceled: 'Checkout cancelado',
    error: 'Checkout expirado ou com erro',
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>{titles[variant]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Recebemos o retorno do Checkout. Estamos confirmando o pagamento com o Asaas.
          </p>
          <p className="text-sm text-muted-foreground">Referência: {ref ?? '—'}</p>
          {status && <StatusBadge status={status} />}
          {attempts >= 12 && !status && (
            <p className="text-sm text-amber-600 dark:text-amber-400">Confirmação ainda não recebida. Aguarde o webhook ou reconcilie manualmente.</p>
          )}
          <Button asChild><Link href="/dashboard">Voltar ao dashboard</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
