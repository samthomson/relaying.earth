import { CopyButton } from '@/components/CopyButton';

interface IdentityRowsProps {
  pubkey: string;
  npub: string;
}

function IdentityRow({
  label,
  display,
  copyValue,
  copyLabel,
}: {
  label: string;
  display: string;
  copyValue: string;
  copyLabel: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative rounded-md border border-border/60 bg-muted/40 py-1.5 pl-2.5 pr-8">
        <span
          className="block break-all font-mono text-[10px] leading-relaxed text-foreground"
          title={copyValue}
        >
          {display}
        </span>
        <CopyButton
          value={copyValue}
          successMessage={`${label} copied`}
          aria-label={copyLabel}
          className="absolute right-1 top-1 h-5 w-5"
        />
      </div>
    </div>
  );
}

export function IdentityRows({ pubkey, npub }: IdentityRowsProps) {
  return (
    <div className="space-y-3 text-sm">
      <IdentityRow
        label="Pubkey"
        display={`${pubkey.slice(0, 8)}…${pubkey.slice(-6)}`}
        copyValue={pubkey}
        copyLabel="Copy pubkey"
      />
      <IdentityRow
        label="npub"
        display={npub}
        copyValue={npub}
        copyLabel="Copy npub"
      />
    </div>
  );
}
