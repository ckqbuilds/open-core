import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

/**
 * Styled native <select>. Native is deliberate: on mobile it opens the OS
 * picker, which is faster and more accessible than a custom dropdown.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
