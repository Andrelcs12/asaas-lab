'use client';

import { useAuth } from '@/lib/auth';

export function RoleGuard({
  adminOnly,
  children,
  fallback = null,
}: {
  adminOnly?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAdmin } = useAuth();
  if (adminOnly && !isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}
