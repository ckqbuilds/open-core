import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Text-button disclosure, closed by default (same pattern as AvoidanceDigest). */
export function Disclosure({
  label,
  icon,
  open: controlledOpen,
  onOpenChange,
  buttonClassName,
  children,
  id,
  description,
}: {
  label: ReactNode;
  icon?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonClassName?: string;
  children: ReactNode;
  id?: string;
  /** Muted helper text under the button, announced with it. */
  description?: ReactNode;
}) {
  const [inner, setInner] = useState(false);
  const open = controlledOpen ?? inner;
  const panelId = useId();
  const descId = useId();
  return (
    <section id={id} className="scroll-mt-24">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={description ? descId : undefined}
        onClick={() => (onOpenChange ? onOpenChange(!open) : setInner(!open))}
        className={cn(
          "inline-flex min-h-10 items-center gap-1.5 rounded-sm text-left text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          buttonClassName
        )}
      >
        {icon}
        {label}
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {description && (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      <div id={panelId} hidden={!open} className="pt-2">
        {open && children}
      </div>
    </section>
  );
}
