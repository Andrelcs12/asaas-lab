import { Inbox } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
