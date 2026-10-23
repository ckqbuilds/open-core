import type { ReactNode } from "react";
import { Card } from "@heroui/react";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "critical" | "accent";

const toneAccent: Record<StatTone, string> = {
  default: "",
  critical: "text-[color:var(--status-critical)]",
  accent: "text-primary",
};

/**
 * A single dashboard KPI: big value, quiet label, optional icon + hint. Tone colours the
 * value itself, so status needs no side stripe. Built on HeroUI Card so
 * the whole KPI row shares the library's surface, radius, and elevation.
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
}) {
  return (
    <Card
      className="p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      </div>
      <div className={cn("mt-2 text-3xl font-semibold tabular-nums leading-none tracking-tight", toneAccent[tone])}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
