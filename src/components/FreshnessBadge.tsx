import { RadioTower } from "lucide-react";
import { relativeTime, type LiveOutbreaks } from "@/data/outbreaksLive";

/** Shows how fresh the scraped FDA outbreak feed is (or "Curated" on fallback). */
export function FreshnessBadge({ live, loading }: { live: LiveOutbreaks | null; loading: boolean }) {
  if (loading || !live) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={
        live.stale
          ? "Live FDA feed unavailable — showing curated outbreaks"
          : "From the scheduled FDA CORE scrape"
      }
    >
      <RadioTower
        className={`size-3.5 ${live.stale ? "text-muted-foreground" : "text-[var(--status-good)]"}`}
      />
      {live.stale ? "Curated" : `Updated ${relativeTime(live.generatedAt)}`}
    </span>
  );
}
