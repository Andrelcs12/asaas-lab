import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={copy} title={label ?? 'Copiar'}>
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function ExternalIdField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2">
      <code className="rounded-lg bg-muted px-2 py-1 text-xs text-foreground">{value}</code>
      <CopyButton value={value} label={`Copiar ${label}`} />
    </div>
  );
}
