import { CopyButton } from './copy-button';

export function ExternalIdField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="rounded-lg bg-muted px-2 py-1 text-xs text-foreground">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}
