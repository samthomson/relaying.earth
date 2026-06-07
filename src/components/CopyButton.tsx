import { Copy } from 'lucide-react';

import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  value: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
  'aria-label'?: string;
}

export function CopyButton({
  value,
  successMessage = 'Copied',
  errorMessage = 'Could not copy',
  className,
  'aria-label': ariaLabel = 'Copy to clipboard',
}: CopyButtonProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: successMessage });
    } catch {
      toast({ title: errorMessage, variant: 'destructive' });
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
      onClick={() => void handleCopy()}
      aria-label={ariaLabel}
    >
      <Copy className="h-2.5 w-2.5" strokeWidth={1.75} />
    </button>
  );
}
