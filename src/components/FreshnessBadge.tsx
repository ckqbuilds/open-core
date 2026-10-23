import { RadioTower, TriangleAlert } from "lucide-react";
import { relativeTime } from "@/data/outbreaksLive";
import { cn } from "@/lib/utils";

/** A feed older than this is flagged as possibly missing recent records. */
const FSIS_STALE_DAYS = 14;

interface FeedLike {
  generatedAt: string | null;
  stale: boolean;
}

/**
 * Shows how fresh a scraped feed is. `kind="outbreaks"` is the FDA outbreak
 * feed ("Curated" on fallback); `kind="fsis"` is the USDA FSIS recall feed,
 * which shows a visible warning when it is old or failed to load.
 */
export function FreshnessBadge({
  live,
  loading,
  kind = "outbreaks",
  failed = false,
}: {
  live: FeedLike | null;
  loading: boolean;
  kind?: "outbreaks" | "fsis";
  /** The feed request itself errored (fsis only). */
  failed?: boolean;
}) {
  if (loading) return null;

  if (kind === "fsis") {
    const gen = live?.generatedAt ? new Date(live.generatedAt) : null;
    const validGen = gen && !Number.isNaN(gen.getTime()) ? gen : null;
    const unavailable = failed || !live || live.stale || !validGen;
    const ageDays = validGen ? (Date.now() - validGen.getTime()) / 86_400_000 : 0;
    const old = !unavailable && ageDays > FSIS_STALE_DAYS;
    if (unavailable || old) {
      return (
        <span
          className="inline-flex items-start gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300"
          role="status"
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {unavailable
            ? "FSIS feed unavailable — showing FDA only"
            : `FSIS feed last updated ${validGen!.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })} — may be missing recent meat & poultry recalls`}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        title="From the scheduled USDA FSIS scrape"
      >
        <RadioTower className="size-3.5 text-[var(--status-good)]" aria-hidden />
        FSIS feed updated {relativeTime(live!.generatedAt)}
      </span>
    );
  }

  if (!live) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={live.stale ? undefined : "From the scheduled FDA CORE scrape"}
    >
      <RadioTower
        className={cn("size-3.5", live.stale ? "text-muted-foreground" : "text-[var(--status-good)]")}
      />
      {live.stale ? "Live FDA feed unavailable · showing curated outbreaks" : `Updated ${relativeTime(live.generatedAt)}`}
    </span>
  );
}
