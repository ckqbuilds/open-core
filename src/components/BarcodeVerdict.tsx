import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@heroui/react";
import { Chip } from "@/components/ui/chip";
import { AlertTriangle, ShieldCheck, ExternalLink } from "lucide-react";
import type { Recall } from "@/data/types";
import type { RecallMatches } from "@/data/barcodeMatch";
// Read-only reuse of the shared classification → chip-color mapping.
import { cn } from "@/lib/utils";
import { classificationChip, agencyChip, agencyLabel } from "@/lib/classification";

/**
 * The verdict for an in-store barcode check.
 *
 * The authority is FDA/FSIS recall data — Open Food Facts only supplied the
 * product identity we searched. An exact hit means the barcode matches a recall's
 * listed UPC; a "possible" hit means the brand matches but maybe not this exact
 * item. We NEVER say "safe": a non-match is phrased as "not named in any current
 * recall", the honest claim we can make.
 */
function FeedNote({ note }: { note?: string | null }) {
  if (!note) return null;
  return <p className="mt-3 border-t border-dotted pt-2 text-xs text-muted-foreground">{note}</p>;
}

export function BarcodeVerdict({ matches, feedNote }: { matches: RecallMatches; feedNote?: string | null }) {
  return (
    <div role="status">
      {matches.exact.length > 0 ? (
        <Recalled recalls={matches.exact} tier="exact" feedNote={feedNote} />
      ) : matches.possible.length > 0 ? (
        <Recalled recalls={matches.possible} total={matches.possibleTotal} brand={matches.possibleBrand} tier="possible" feedNote={feedNote} />
      ) : (
        <NotFound feedNote={feedNote} />
      )}
    </div>
  );
}

function Recalled({ recalls, tier, total, brand, feedNote }: { recalls: Recall[]; tier: "exact" | "possible"; total?: number; brand?: string | null; feedNote?: string | null }) {
  const exact = tier === "exact";
  const accent = exact ? "var(--status-critical)" : "var(--warning)";
  const title = exact
    ? recalls.length === 1
      ? "This product is under recall"
      : `This product matches ${recalls.length} recalls on record (last 3 years)`
    : "A similarly named brand appears in recalls";
  const blurb = exact
    ? "The barcode matches the recalled product code in the official FDA/FSIS record below. Confirm the lot/date codes on your package against the notice."
    : "Records name a similarly named brand. Compare the product in your hand to each notice; a name match is not a recall match.";

  return (
    <Card
      className="p-4"
      style={{ borderColor: `color-mix(in oklab, ${accent} 40%, transparent)`, backgroundColor: `color-mix(in oklab, ${accent} 5%, transparent)` }}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" style={{ color: accent }} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold" style={{ color: accent }}>
            {title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{blurb}</p>

          <ul className="mt-3 space-y-3">
            {recalls.map((r) => (
              <li key={r.id} className="rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip {...classificationChip(r.classification)} size="sm">
                    {r.classification}
                  </Chip>
                  <Chip {...agencyChip(r.agency)} size="sm">
                    {agencyLabel(r.agency)}
                  </Chip>
                </div>
                {exact ? (
                  <p className="mt-2 text-sm font-medium">{r.productDescription}</p>
                ) : (
                  <PossibleDesc text={r.productDescription} />
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Recalling firm: {r.recallingFirm} ·{" "}
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />#{r.recallNumber}
                    </a>
                  ) : (
                    <>#{r.recallNumber}</>
                  )}
                </p>
              </li>
            ))}
          </ul>
          {!exact && total != null && total > recalls.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {recalls.length} of {total} records naming this brand, highest severity first.{" "}
              <Link to={`/recalls?archive=1&q=${encodeURIComponent(brand ?? "")}`} className="font-medium text-primary hover:underline">
                Show all {total}
              </Link>
            </p>
          )}
          <FeedNote note={feedNote} />
        </div>
      </div>
    </Card>
  );
}

function PossibleDesc({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160;
  return (
    <>
      <p className={cn("mt-2 text-sm font-medium", long && !open && "line-clamp-2")}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="-my-2 inline-flex min-h-10 items-center rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}

function NotFound({ feedNote }: { feedNote?: string | null }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-base font-semibold">Not named in any recall on record (last 3 years)</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            No FDA or USDA FSIS recall we track names this product. That is not a guarantee of
            safety — coverage is uneven and recalls change often. If in doubt, check the official
            FDA/CDC sources.
          </p>
          <FeedNote note={feedNote} />
        </div>
      </div>
    </Card>
  );
}
