import type { ReactNode } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { SourceCitation } from "@/data/types";
import { cn, formatIso } from "@/lib/utils";

/** A citation link: every claim about a named entity must carry one. */
export function SourceLink({ source, className }: { source: SourceCitation; className?: string }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className={cn("link inline-flex items-center gap-1 text-xs", className)}
    >
      <ExternalLink className="size-3" />
      {source.agency} source ({formatIso(source.date)})
    </a>
  );
}

/** A plain external link in the world's link style. */
export function OutLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn("link inline-flex items-center gap-1", className)}>
      <ExternalLink className="size-3" />
      {children}
    </a>
  );
}

/**
 * A lobe: one flat colour swelling past its box. The focused region of a page
 * lives inside one; nothing else on the page gets a fill.
 */
export function Lobe({
  tone = "land",
  soft,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: "land" | "pond" | "sun" | "lilac" | "coral";
  /** Smaller, calmer corners for an in-flow block rather than a bleeding region. */
  soft?: boolean;
}) {
  return (
    <div
      {...props}
      className={cn("lobe", tone !== "land" && `lobe--${tone}`, soft && "lobe--soft", className)}
    >
      {children}
    </div>
  );
}

/** Paper laid on the water: an ink-outlined sheet. The world's one container. */
export function Sheet({
  quiet,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { quiet?: boolean }) {
  return (
    <div {...props} className={cn("sheet", quiet && "sheet--quiet", className)}>
      {children}
    </div>
  );
}

/** Section heading: display weight, an optional count, an optional trailing slot. */
export function SectionHeading({
  children,
  count,
  icon,
  actions,
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  count?: number | string;
  icon?: ReactNode;
  actions?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-2", className)}>
      <Tag className="display-md flex items-center gap-2.5 text-2xl">
        {icon}
        <span>
          {children}
          {count !== undefined && <span className="tnum ml-2 font-medium text-ink-2">{count}</span>}
        </span>
      </Tag>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border-2 border-dashed border-rule p-8 text-center text-sm text-ink-2", className)}>
      {children}
    </div>
  );
}

/** A quiet aside on the ground: an outlined sheet, never a tinted card. */
export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Sheet quiet className={cn("p-4 text-sm text-ink-2", className)}>
      {children}
    </Sheet>
  );
}

export function Loading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("flex h-32 items-center justify-center gap-2 text-sm text-ink-2", className)}>
      <Loader2 className="size-4 animate-spin" /> {children}
    </div>
  );
}

/**
 * Shown when location features are used but no Mapbox token is configured.
 *
 * Developer setup (not shown to the public):
 *  1. Create a public token at https://account.mapbox.com/access-tokens/ and
 *     URL-restrict it to your domain + http://localhost:5173.
 *  2. Copy .env.example to .env.local and set VITE_MAPBOX_TOKEN=pk.…
 *  3. Restart `npm run dev`.
 */
export function MapsDisabledNote({ page = "default" }: { page?: "default" | "shop-local" }) {
  return (
    <Sheet quiet className="space-y-2 p-5 text-sm">
      <div className="font-bold">
        {page === "shop-local"
          ? "Maps aren't available right now. The list still works from your ZIP."
          : "Maps and location search aren't available right now"}
      </div>
      <p className="prose-measure text-ink-2">
        {page === "shop-local"
          ? "To browse local food sources yourself, try the"
          : "The recalls and the companies named in the official record are still listed on each food and outbreak page. To find local food sources near you, try the"}{" "}
        <a className="link" href="https://www.usdalocalfoodportal.com/" target="_blank" rel="noreferrer">
          USDA Local Food Directories
        </a>
        .
      </p>
    </Sheet>
  );
}
