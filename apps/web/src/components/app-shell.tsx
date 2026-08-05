'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Users,
  Webhook,
  Repeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/payments', label: 'Pagamentos', icon: CreditCard },
  { href: '/subscriptions', label: 'Assinaturas', icon: Repeat },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/audit', label: 'Auditoria', icon: ScrollText },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950/95 backdrop-blur lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
          <FlaskConical className="h-6 w-6 text-emerald-500" />
          <span className="font-semibold">Asaas Payment Lab</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                pathname.startsWith(href)
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {isDev && isAdmin && (
            <Link
              href="/sandbox"
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                pathname.startsWith('/sandbox')
                  ? 'bg-zinc-800 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
              )}
            >
              <FlaskConical className="h-4 w-4" />
              Sandbox Tools
            </Link>
          )}
        </nav>
        <div className="border-t border-zinc-800 p-4">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-zinc-200">{user?.name}</p>
            <p className="text-xs text-zinc-500">{user?.email}</p>
            <p className="mt-1 text-xs text-emerald-500">{user?.role}</p>
          </div>
          <Button variant="secondary" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur lg:hidden">
          <FlaskConical className="h-5 w-5 text-emerald-500" />
          <span className="ml-2 font-medium">Asaas Lab</span>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
