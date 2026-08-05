import { Suspense } from 'react';
import CheckoutCallbackPage from '../checkout-callback';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Carregando...</div>}>
      <CheckoutCallbackPage variant="pending" />
    </Suspense>
  );
}
