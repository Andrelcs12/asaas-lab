'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  ScrollText,
  Settings,
  ShoppingCart,
  Users,
  Webhook,
  Repeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/checkout/new', label: 'Novo Checkout', icon: PlusCircle, adminOnly: true },
  { href: '/checkouts', label: 'Checkouts', icon: ShoppingCart },
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

  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card/95 backdrop-blur lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <FlaskConical className="h-6 w-6 text-primary" />
          <span className="font-semibold">Asaas Payment Lab</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                pathname.startsWith(href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                pathname.startsWith('/sandbox')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <FlaskConical className="h-4 w-4" />
              Sandbox
            </Link>
          )}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="mt-1 text-xs text-primary">{user?.role}</p>
          </div>
          <Button variant="secondary" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="flex items-center lg:hidden">
            <FlaskConical className="h-5 w-5 text-primary" />
            <span className="ml-2 font-medium">Asaas Lab</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
