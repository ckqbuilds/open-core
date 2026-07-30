import type { Outbreak, OutbreakFeed } from "./types";
import { mergeLiveOutbreaks, curatedFallbackOutbreaks } from "./outbreaks";

export interface LiveOutbreaks {
  outbreaks: Outbreak[];
  generatedAt: string | null;
  /** True when we're showing the curated fallback (live feed unavailable). */
  stale: boolean;
}

/**
 * Load the scraped FDA outbreak feed (public/outbreaks.json, refreshed by the
 * cron scraper) and merge in hand-verified detail. Falls back to the curated
 * outbreaks alone if the feed is missing — so the app degrades to "known
 * outbreaks" rather than showing nothing.
 */
export async function loadOutbreaks(signal?: AbortSignal): Promise<LiveOutbreaks> {
  try {
    const res = await fetch(`/outbreaks.json?t=${Date.now()}`, { signal });
    if (!res.ok) throw new Error(String(res.status));
    const feed = (await res.json()) as OutbreakFeed;
    if (!Array.isArray(feed.outbreaks)) throw new Error("bad feed");
    return {
      outbreaks: mergeLiveOutbreaks(feed),
      generatedAt: feed.generatedAt,
      stale: false,
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    return { outbreaks: curatedFallbackOutbreaks(), generatedAt: null, stale: true };
  }
}

/** "3 hours ago" style relative time for the freshness indicator. */
export function relativeTime(iso: string | null): string {
  if (!iso) return "curated data";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "curated data";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
