'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PasswordInput } from '@/components/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

const TEST_ACCOUNTS = [
  {
    role: 'Admin',
    description: 'Acesso completo (criar, editar, estornar)',
    email: 'admin@lab.local',
    password: 'Lab@123456',
  },
  {
    role: 'Cliente',
    description: 'Somente leitura (VIEWER)',
    email: 'viewer@lab.local',
    password: 'Lab@123456',
  },
] as const;

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    router.replace('/dashboard');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Login realizado');
      router.push('/dashboard');
    } catch {
      toast.error('Credenciais inválidas');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Asaas Payment Lab</CardTitle>
          <CardDescription>Laboratório de integração com o Sandbox do Asaas</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <p className="text-center text-xs font-medium text-muted-foreground">
              Contas de teste — clique para preencher
            </p>
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="w-full rounded-xl border border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{account.role}</span>
                  <span className="text-[11px] text-muted-foreground">{account.description}</span>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr>
                      <td className="w-16 py-0.5 text-muted-foreground">E-mail</td>
                      <td className="py-0.5 font-mono">{account.email}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-muted-foreground">Senha</td>
                      <td className="py-0.5 font-mono">{account.password}</td>
                    </tr>
                  </tbody>
                </table>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
