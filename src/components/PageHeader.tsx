import type { ReactNode } from "react";

/**
 * One header rhythm for every page: a display title, a short measure of
 * description, and a trailing actions slot. No icon, no eyebrow: the title
 * carries its own weight.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="prose-measure mt-4 text-base text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
