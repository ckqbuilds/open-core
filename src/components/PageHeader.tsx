import type { ReactNode } from "react";

/**
 * One header rhythm for every page: an optional eyebrow + icon, a strong title,
 * a constrained description, and a trailing actions slot. Consistency here is
 * what makes the pages feel like one product (predictable-behavior principle).
 */
export function PageHeader({
  title,
  description,
  icon,
  eyebrow,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {icon}
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        </div>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
