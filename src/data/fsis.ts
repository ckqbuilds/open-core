import type { Recall } from "./types";
import { extractUpcs } from "./avoidance";

// FSIS publishes each recall in English AND Spanish as separate records that
// share a recall number. We keep the English one. These markers score a record's
// language from its product/reason text (the normalized feed has no langcode).
const SPANISH =
  /\b(onzas|libras|gramos|contienen?|envases?|cajas?|paquetes?|estuches?|etiqueta|frescura|pollo|carne\s+de|congelad\w*|listo\s+para|bolsas?|unidades|fecha\s+de|c[oó]digo\s+de\s+lote|transparentes?|vac[ií]o)\b/gi;
const ENGLISH =
  /\b(containing|packages?|cases?|trays?|pouches?|labels?|use\s+by|best\s+by|lb\.|oz\.|ready-to-eat|frozen|chicken|beef|pork|net\s+weight|lot\s+code|bags?)\b/gi;

const count = (re: RegExp, s: string) => (s.match(re) ?? []).length;

/** Keep the English record of each recall number; drop Spanish duplicates/stragglers. */
function englishOnly(recalls: Recall[]): Recall[] {
  const best = new Map<string, Recall>();
  const langScore = (r: Recall) => {
    const s = `${r.productDescription} ${r.reason}`;
    return count(ENGLISH, s) - count(SPANISH, s);
  };
  for (const r of recalls) {
    const key = r.recallNumber || r.id;
    const cur = best.get(key);
    if (!cur || langScore(r) > langScore(cur)) best.set(key, r);
  }
  return [...best.values()].filter((r) => {
    const s = `${r.productDescription} ${r.reason}`;
    return !(count(ENGLISH, s) === 0 && count(SPANISH, s) >= 2);
  });
}

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
    // Best-effort UPCs: FSIS leans on establishment (EST) numbers and lot codes,
    // so barcodes are usually absent — extract from the product text when the
    // notice does print them, and leave upcs undefined otherwise.
    const recalls = englishOnly(feed.recalls as Recall[]).map((r) => {
      const upcs = extractUpcs(r.codeInfo, r.productDescription);
      return upcs.length > 0 ? { ...r, upcs } : r;
    });
    return { generatedAt: feed.generatedAt ?? null, recalls, stale: false };
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
