import type { Recall } from "./types";

export interface FsisFeed {
  generatedAt: string | null;
  recalls: Recall[];
  /** True when the feed is missing/unreachable — the app shows FDA-only. */
  stale: boolean;
}

/**
 * Load the USDA FSIS meat/poultry recall feed (public/fsis-recalls.json,
 * refreshed by the cron scraper). Returns an empty, non-fatal feed if the file
 * is absent — so the recalls view degrades to FDA-only rather than erroring.
 */
export async function loadFsisRecalls(signal?: AbortSignal): Promise<FsisFeed> {
  try {
    const res = await fetch(`/fsis-recalls.json?t=${Date.now()}`, { signal });
    if (!res.ok) throw new Error(String(res.status));
    const feed = await res.json();
    if (!Array.isArray(feed.recalls)) throw new Error("bad feed");
    return { generatedAt: feed.generatedAt ?? null, recalls: feed.recalls as Recall[], stale: false };
  } catch (err) {
    if (signal?.aborted) throw err;
    return { generatedAt: null, recalls: [], stale: true };
  }
}

/** YYYYMMDD → epoch ms, or null if unparseable. */
function ymdToMs(ymd?: string): number | null {
  if (!ymd || !/^\d{8}$/.test(ymd)) return null;
  const t = Date.parse(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`);
  return Number.isNaN(t) ? null : t;
}

/**
 * FSIS recalls that plausibly relate to an outbreak: SAME detected pathogen and,
 * when the outbreak has a posting date, a report date within `windowDays` of it.
 *
 * This is a coincidence filter, NOT a claim of a shared investigation — the only
 * authoritative cross-agency link is a genomic cluster, which these feeds don't
 * share. Callers must label the result as "possibly related", never "linked".
 */
export function correlateFsisRecalls(
  recalls: Recall[],
  pathogenId: string | null,
  outbreakDateIso: string | null,
  windowDays = 180
): Recall[] {
  if (!pathogenId) return [];
  const anchor = outbreakDateIso ? Date.parse(outbreakDateIso) : NaN;
  const windowMs = windowDays * 86_400_000;
  return recalls
    .filter((r) => r.pathogen === pathogenId)
    .filter((r) => {
      if (Number.isNaN(anchor)) return true; // no outbreak date → pathogen match alone
      const ms = ymdToMs(r.reportDate ?? r.recallInitiationDate);
      return ms == null || Math.abs(ms - anchor) <= windowMs;
    })
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""));
}
