'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-elements';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';

export default function NewCustomerPage() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (body: Record<string, string>) => (await api.post('/customers', body)).data,
    onSuccess: (data) => {
      toast.success('Cliente criado');
      router.push(`/customers/${data.id}`);
    },
    onError: () => toast.error('Erro ao criar cliente'),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate(Object.fromEntries(form) as Record<string, string>);
  };

  return (
    <div>
      <PageHeader title="Novo cliente" description="Cadastre um cliente local para sincronizar com o Asaas" />
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" required /></div>
            <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div>
            <div><Label htmlFor="cpfCnpj">CPF/CNPJ</Label><Input id="cpfCnpj" name="cpfCnpj" required /></div>
            <div><Label htmlFor="phone">Telefone</Label><Input id="phone" name="phone" /></div>
            <div><Label htmlFor="address">Endereço</Label><Input id="address" name="address" /></div>
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
