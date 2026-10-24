import { useState } from "react";
import { Link } from "react-router-dom";
import { Chip } from "@/components/ui/chip";
import { AlertTriangle, SearchX, ExternalLink } from "lucide-react";
import type { Recall } from "@/data/types";
import type { RecallMatches } from "@/data/barcodeMatch";
// Read-only reuse of the shared classification → chip-color mapping.
import { cn } from "@/lib/utils";
import { classificationChip, classificationTitle, agencyChip, agencyLabel } from "@/lib/classification";
import { Lobe, Sheet } from "@/components/common";

/**
 * The verdict for an in-store barcode check.
 *
 * The authority is FDA/FSIS recall data — Open Food Facts only supplied the
 * product identity we searched. An exact hit means the barcode matches a recall's
 * listed UPC; a "possible" hit means the brand matches but maybe not this exact
 * item. We NEVER say "safe": a non-match is phrased as "not named in any current
 * recall", the honest claim we can make.
 */
function FeedNote({ note, emphasize, onFill }: { note?: string | null; emphasize?: boolean; onFill?: boolean }) {
  if (!note) return null;
  return (
    <p className={cn("mt-2 text-sm", !onFill && "text-ink-2", emphasize && "font-semibold", emphasize && !onFill && "text-ink")}>
      {note}
    </p>
  );
}

export function BarcodeVerdict({ matches, feedNote, emphasizeNote }: { matches: RecallMatches; feedNote?: string | null; emphasizeNote?: boolean }) {
  return (
    <div role="status">
      {matches.exact.length > 0 ? (
        <Recalled recalls={matches.exact} tier="exact" feedNote={feedNote} emphasize={emphasizeNote} />
      ) : matches.possible.length > 0 ? (
        <Recalled recalls={matches.possible} total={matches.possibleTotal} brand={matches.possibleBrand} tier="possible" feedNote={feedNote} emphasize={emphasizeNote} />
      ) : (
        <NotFound feedNote={feedNote} emphasize={emphasizeNote} />
      )}
    </div>
  );
}

function Recalled({ recalls, tier, total, brand, feedNote, emphasize }: { recalls: Recall[]; tier: "exact" | "possible"; total?: number; brand?: string | null; feedNote?: string | null; emphasize?: boolean }) {
  const exact = tier === "exact";
  const title = exact
    ? recalls.length === 1
      ? "This product is under recall"
      : `This product matches ${recalls.length} recalls on record (last 3 years)`
    : "A similarly named brand appears in recalls";
  const blurb = exact
    ? "The barcode matches the recalled product code in the official FDA/FSIS record below. Confirm the lot/date codes on your package against the notice."
    : "Records name a similarly named brand. Compare the product in your hand to each notice; a name match is not a recall match.";

  return (
    <Lobe tone={exact ? "coral" : "sun"} soft className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 size-6 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="display-md text-2xl">{title}</h2>
          <p className="prose-measure mt-2 text-sm">{blurb}</p>
          <FeedNote note={feedNote} emphasize={emphasize} onFill />

          <ul className="mt-4 space-y-3">
            {recalls.map((r) => (
              <li key={r.id} className="lobe__water p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip {...classificationChip(r.classification)} title={classificationTitle(r.classification)}>
                    {r.classification}
                  </Chip>
                  <Chip {...agencyChip(r.agency)}>{agencyLabel(r.agency)}</Chip>
                </div>
                {exact ? (
                  <p className="mt-2 text-sm font-semibold">{r.productDescription}</p>
                ) : (
                  <PossibleDesc text={r.productDescription} />
                )}
                <p className="mt-1 text-xs text-ink-2">
                  Recalling firm: {r.recallingFirm} ·{" "}
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
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
            <p className="mt-3 text-xs">
              Showing {recalls.length} of {total} records naming this brand, highest severity first.{" "}
              <Link to={`/recalls?archive=1&q=${encodeURIComponent(brand ?? "")}`} className="font-bold underline">
                Show all {total}
              </Link>
            </p>
          )}
        </div>
      </div>
    </Lobe>
  );
}

function PossibleDesc({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160;
  return (
    <>
      <p className={cn("mt-2 text-sm font-semibold", long && !open && "line-clamp-2")}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="link -my-2 inline-flex min-h-10 items-center text-xs"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}

function NotFound({ feedNote, emphasize }: { feedNote?: string | null; emphasize?: boolean }) {
  return (
    <Sheet className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <SearchX className="mt-1 size-6 shrink-0 text-ink-2" aria-hidden />
        <div className="min-w-0">
          <h2 className="display-md text-2xl">Not named in any recall on record (last 3 years)</h2>
          <p className="prose-measure mt-2 text-sm text-ink-2">
            No FDA or USDA FSIS recall we track names this product. That is not a guarantee of
            safety — coverage is uneven and recalls change often. If in doubt, check the official
            FDA/CDC sources.
          </p>
          <FeedNote note={feedNote} emphasize={emphasize} />
        </div>
      </div>
    </Sheet>
  );
}
