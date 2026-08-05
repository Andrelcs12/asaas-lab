import { CopyButton } from './copy-button';

export function ExternalIdField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="rounded-lg bg-zinc-900 px-2 py-1 text-xs text-zinc-300">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}
