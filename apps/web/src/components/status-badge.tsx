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
  DRAFT: { label: 'Rascunho', icon: Clock, className: 'bg-zinc-800 text-zinc-300' },
  PENDING: { label: 'Pendente', icon: Clock, className: 'bg-amber-950 text-amber-300 border-amber-800' },
  CHECKOUT_CREATED: { label: 'Checkout criado', icon: Loader2, className: 'bg-blue-950 text-blue-300 border-blue-800' },
  PROCESSING: { label: 'Processando', icon: Loader2, className: 'bg-blue-950 text-blue-300 border-blue-800' },
  CONFIRMED: { label: 'Confirmado', icon: CheckCircle2, className: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  RECEIVED: { label: 'Recebido', icon: CheckCircle2, className: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  OVERDUE: { label: 'Vencido', icon: AlertCircle, className: 'bg-orange-950 text-orange-300 border-orange-800' },
  REFUNDED: { label: 'Estornado', icon: RefreshCw, className: 'bg-purple-950 text-purple-300 border-purple-800' },
  FAILED: { label: 'Falhou', icon: XCircle, className: 'bg-red-950 text-red-300 border-red-800' },
  EXPIRED: { label: 'Expirado', icon: Ban, className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  CANCELED: { label: 'Cancelado', icon: Ban, className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  ACTIVE: { label: 'Ativa', icon: CheckCircle2, className: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  PAUSED: { label: 'Pausada', icon: PauseCircle, className: 'bg-amber-950 text-amber-300 border-amber-800' },
  PROCESSED: { label: 'Processado', icon: CheckCircle2, className: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  IGNORED: { label: 'Ignorado', icon: Ban, className: 'bg-zinc-800 text-zinc-400' },
  SYNCED: { label: 'Sincronizado', icon: CheckCircle2, className: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    icon: AlertCircle,
    className: 'bg-zinc-800 text-zinc-300',
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
