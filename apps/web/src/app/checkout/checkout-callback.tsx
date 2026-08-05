'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';

export default function CheckoutCallbackPage({ variant }: { variant: 'success' | 'pending' | 'canceled' | 'error' }) {
  const params = useSearchParams();
  const ref = params.get('ref');
  const [status, setStatus] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!ref || variant === 'canceled' || variant === 'error') return;

    const poll = async () => {
      try {
        const order = await api.get(`/payment-orders?limit=100`);
        const found = order.data.data.find((o: { externalReference: string }) => o.externalReference === ref);
        if (found?.status === 'CONFIRMED') {
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>{titles[variant]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-400">
            Recebemos o retorno do Checkout. Estamos confirmando o pagamento com o Asaas.
          </p>
          <p className="text-sm text-zinc-500">Referência: {ref ?? '—'}</p>
          {status && <StatusBadge status={status} />}
          {attempts >= 12 && !status && (
            <p className="text-amber-400 text-sm">Confirmação ainda não recebida. Aguarde o webhook ou reconcilie manualmente.</p>
          )}
          <Button asChild><Link href="/dashboard">Voltar ao dashboard</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
