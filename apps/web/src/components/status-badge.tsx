import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  DRAFT: {
    label: 'Rascunho',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  PENDING: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  CHECKOUT_CREATED: {
    label: 'Checkout criado',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  PROCESSING: {
    label: 'Processando',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  CONFIRMED: {
    label: 'Confirmado',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  RECEIVED: {
    label: 'Recebido',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  OVERDUE: {
    label: 'Vencido',
    icon: AlertCircle,
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  },
  REFUNDED: {
    label: 'Estornado',
    icon: RefreshCw,
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  },
  FAILED: {
    label: 'Falhou',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
  EXPIRED: {
    label: 'Expirado',
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border',
  },
  CANCELED: {
    label: 'Cancelado',
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border',
  },
  ACTIVE: {
    label: 'Ativa',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  PAUSED: {
    label: 'Pausada',
    icon: PauseCircle,
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  PROCESSED: {
    label: 'Processado',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  IGNORED: {
    label: 'Ignorado',
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border',
  },
  CREATED: {
    label: 'Criado',
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  OPENED: {
    label: 'Aberto',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  CREATING: {
    label: 'Criando',
    icon: Loader2,
    className: 'bg-muted text-muted-foreground border-border',
  },
  COMPLETED: {
    label: 'Concluído',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  ONE_TIME: {
    label: 'Avulso',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  SUBSCRIPTION: {
    label: 'Assinatura',
    icon: RefreshCw,
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  },
  SYNCED: {
    label: 'Sincronizado',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    icon: AlertCircle,
    className: 'bg-muted text-muted-foreground border-border',
  };
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
