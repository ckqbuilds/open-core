import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const linkClass =
  "inline-flex items-baseline gap-1.5 rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:-my-3 pointer-coarse:min-h-10 pointer-coarse:items-center";

const FDA_PAGE = "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts";

/** The dotted hairline used to rule a card's record line off from its body. */
export const recordRule = "border-t border-dotted border-[color:var(--muted)]/50";

export interface RecordExtra {
  label: string;
  url?: string;
}

/**
 * The record line: a ledger-style citation. "Record ..... agency #number date".
 * Every place the app cites an official record renders through this, so the
 * citation itself is the product's signature. The reference number is data, so
 * it is set in monospace with tabular numerals.
 */
export function RecordLine({
  agency,
  reference,
  date,
  url,
  extras,
  className,
}: {
  agency: string;
  reference?: string;
  date?: string | null;
  url?: string;
  extras?: RecordExtra[];
  className?: string;
}) {
  const isJson = !!url && /api\.fda\.gov/.test(url);
  const body = (
    <>
      <span>{agency}</span>
      {reference && <span className="font-mono tabular-nums text-foreground">{reference}</span>}
    </>
  );
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="inline-flex shrink-0 items-center gap-1">
        <ScrollText aria-hidden className="size-3.5 shrink-0" />
        Record
      </span>
      {/* The dotted leader fills the line on wide screens; on phones the
          values drop to their own line so the leader never collapses. */}
      <span
        aria-hidden
        className="hidden min-w-8 flex-1 -translate-y-[3px] border-b border-dotted border-[color:var(--muted)]/50 sm:block"
      />
      <span className="flex w-full min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 sm:w-auto sm:justify-end sm:text-right">
        {url && !isJson ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
            title="Opens the official notice"
          >
            {body}
          </a>
        ) : (
          <span className="inline-flex items-baseline gap-1.5">{body}</span>
        )}
        {date && <span className="tabular-nums">{date}</span>}
        {isJson && (
          <>
            <a href={FDA_PAGE} target="_blank" rel="noreferrer" className={linkClass}>
              FDA recalls page
            </a>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Opens this record in the openFDA API (JSON)"
              className={cn(linkClass, "font-normal text-muted-foreground")}
            >
              raw record (JSON)
            </a>
          </>
        )}
        {extras?.map((x) =>
          x.url ? (
            <a key={x.label} href={x.url} target="_blank" rel="noreferrer" className={linkClass}>
              {x.label}
            </a>
          ) : (
            <span key={x.label} className="tabular-nums">
              {x.label}
            </span>
          )
        )}
      </span>
    </div>
  );
}
