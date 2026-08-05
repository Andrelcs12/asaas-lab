import { formatCurrency } from '@asaas-lab/shared';
import { cn } from '@/lib/utils';

export function MoneyDisplay({
  value,
  className,
  size = 'md',
}: {
  value: number | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const num = typeof value === 'string' ? Number(value) : value;
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl font-semibold' };
  return (
    <span className={cn('font-mono text-emerald-400', sizes[size], className)}>
      {formatCurrency(num)}
    </span>
  );
}
