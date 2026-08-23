import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Simple label + control + hint/error wrapper (used with react-hook-form's register/Controller). */
export function Field({ label, hint, error, className, children, required }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}{required && <span className="text-[#E60C10]"> *</span>}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
