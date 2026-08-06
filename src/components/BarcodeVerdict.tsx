import { Card, Chip } from "@heroui/react";
import { AlertTriangle, ShieldCheck, ExternalLink } from "lucide-react";
import type { Recall } from "@/data/types";
// Read-only reuse of the shared classification → chip-color mapping.
import { classificationColor } from "@/components/RecallRow";

/**
 * The one-line verdict for an in-store barcode check.
 *
 * The authority is FDA/FSIS recall data — Open Food Facts only supplied the
 * product identity we searched. We NEVER say "safe": a non-match is phrased as
 * "not named in any current recall", which is the honest claim we can make.
 */
export function BarcodeVerdict({ matches }: { matches: Recall[] }) {
  if (matches.length > 0) return <Recalled matches={matches} />;
  return <NotFound />;
}

function Recalled({ matches }: { matches: Recall[] }) {
  return (
    <Card className="border-[var(--status-critical)]/40 bg-[var(--status-critical)]/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--status-critical)]" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-[var(--status-critical)]">
            Named in {matches.length === 1 ? "a current recall" : `${matches.length} current recalls`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            This product appears to match {matches.length === 1 ? "an" : ""} official FDA/FSIS recall
            record below. Confirm the details against the linked notice before acting.
          </p>

          <ul className="mt-3 space-y-3">
            {matches.map((r) => (
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
