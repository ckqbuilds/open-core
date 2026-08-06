import { Card, Chip } from "@heroui/react";
import { AlertTriangle, ShieldCheck, ExternalLink } from "lucide-react";
import type { Recall } from "@/data/types";
import type { RecallMatches } from "@/data/barcodeMatch";
// Read-only reuse of the shared classification → chip-color mapping.
import { classificationColor } from "@/components/RecallRow";

/**
 * The verdict for an in-store barcode check.
 *
 * The authority is FDA/FSIS recall data — Open Food Facts only supplied the
 * product identity we searched. An exact hit means the barcode matches a recall's
 * listed UPC; a "possible" hit means the brand matches but maybe not this exact
 * item. We NEVER say "safe": a non-match is phrased as "not named in any current
 * recall", the honest claim we can make.
 */
export function BarcodeVerdict({ matches }: { matches: RecallMatches }) {
  if (matches.exact.length > 0) return <Recalled recalls={matches.exact} tier="exact" />;
  if (matches.possible.length > 0) return <Recalled recalls={matches.possible} tier="possible" />;
  return <NotFound />;
}

function Recalled({ recalls, tier }: { recalls: Recall[]; tier: "exact" | "possible" }) {
  const exact = tier === "exact";
  const accent = exact ? "var(--status-critical)" : "var(--warning)";
  const title = exact
    ? recalls.length === 1
      ? "This product is under recall"
      : `This product matches ${recalls.length} current recalls`
    : "A matching product may be recalled";
  const blurb = exact
    ? "The barcode matches the recalled product code in the official FDA/FSIS record below. Confirm the lot/date codes on your package against the notice."
    : "A product from this brand is under recall, but the barcode didn't match a listed code — check the item and package against the notice below to see if it's the same one.";

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
                  <Chip color={classificationColor(r.classification)} variant="soft" size="sm">
                    {r.classification}
                  </Chip>
                  <Chip color={r.agency === "FSIS" ? "accent" : "default"} variant="soft" size="sm">
                    {r.agency === "FSIS" ? "USDA FSIS" : "FDA"}
                  </Chip>
                </div>
                <p className="mt-2 text-sm font-medium">{r.productDescription}</p>
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
        </div>
      </div>
    </Card>
  );
}

function NotFound() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-base font-semibold">Not named in any current recall</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            No FDA or USDA FSIS recall we track names this product. That is not a guarantee of
            safety — coverage is uneven and recalls change often. If in doubt, check the official
            FDA/CDC sources.
          </p>
        </div>
      </div>
    </Card>
  );
}
