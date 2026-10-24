import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** A capsule that opens a panel below it, closed by default. */
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
  /** Muted helper text beside the capsule, announced with it. */
  description?: ReactNode;
}) {
  const [inner, setInner] = useState(false);
  const open = controlledOpen ?? inner;
  const panelId = useId();
  const descId = useId();
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-describedby={description ? descId : undefined}
          onClick={() => (onOpenChange ? onOpenChange(!open) : setInner(!open))}
          className={cn("capsule max-w-full whitespace-normal text-left [&_svg]:size-4", open && "capsule--ink", buttonClassName)}
        >
          {icon}
          {label}
          <ChevronDown className={cn("transition-transform ease-over", open && "rotate-180")} aria-hidden />
        </button>
        {description && (
          <p id={descId} className="text-xs text-ink-2">
            {description}
          </p>
        )}
      </div>
      <div id={panelId} hidden={!open} className="pt-5">
        {open && children}
      </div>
    </section>
  );
}
