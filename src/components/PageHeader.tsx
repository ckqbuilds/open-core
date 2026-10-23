import type { ReactNode } from "react";

/**
 * One header rhythm for every page: an optional icon, a strong title,
 * a constrained description, and a trailing actions slot. Consistency here is
 * what makes the pages feel like one product (predictable-behavior principle).
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {icon}
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        </div>
        {description && (
          <p className="mt-2 max-w-prose text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
