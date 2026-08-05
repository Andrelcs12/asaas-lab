import { Suspense } from 'react';
import CheckoutCallbackPage from '../checkout-callback';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">Carregando...</div>}>
      <CheckoutCallbackPage variant="error" />
    </Suspense>
  );
}
