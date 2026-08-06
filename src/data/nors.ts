/**
 * CDC NORS — National Outbreak Reporting System (Socrata dataset `5xkq-dg7x`
 * on data.cdc.gov). NORS is the definitive historical record of foodborne
 * disease outbreaks (1998–present, finalized through 2023). Like BEAM
 * (src/data/beam.ts) it sends CORS headers and needs no key, so this runs
 * directly from the browser (rate-limited).
 *
 * Integrity: this layer only supplies SOURCED historical base rates — how many
 * foodborne outbreaks CDC has recorded per year for a pathogen. It never claims
 * anything about *this* outbreak's counts and never implies "safe": the figures
 * are labeled historical (finalized annual) and cited to NORS. When a pathogen
 * has no NORS term or no rows, the fetch resolves to null and the UI omits the
 * band.
 *
 * Future hardening: front this with a small server proxy + a Socrata app token
 * (mirroring the openFDA proxy option) if browser rate limits become a problem.
 */

const BASE = "https://data.cdc.gov/resource/5xkq-dg7x.json";

/**
 * Map a curated `Pathogen.id` to an `etiology like` term. NORS etiology values
 * are free-text ("Salmonella enterica", "Escherichia coli, Shiga toxin-…"), so
 * we match on a stable genus/name fragment. Kept beside the query so adding a
 * pathogen touches one file; deliberately NOT sourced from symptoms.ts.
 */
export const NORS_TERMS: Record<string, string> = {
  salmonella: "Salmonella",
  ecoli: "Escherichia",
  listeria: "Listeria",
  cyclospora: "Cyclospora",
  norovirus: "Norovirus",
  campylobacter: "Campylobacter",
  "hepatitis-a": "Hepatitis A",
  vibrio: "Vibrio",
  shigella: "Shigella",
};

/** One aggregated NORS year (Socrata returns every value as a STRING). */
interface RawNorsRow {
  year?: string;
  count_1?: string; // count(1) — outbreaks that year
  sum_illnesses?: string; // sum(illnesses) — total illnesses that year
}

export interface OutbreakYear {
  year: number;
  outbreaks: number;
  illnesses: number;
}

export interface OutbreakHistory {
  /** Every year returned, ascending. */
  byYear: OutbreakYear[];
  /** The last 10 years of that window, ascending — what the sparkline plots. */
  recent: OutbreakYear[];
  avgOutbreaksPerYear: number;
  avgIllnessesPerYear: number;
  firstYear: number;
  lastYear: number;
  sourceUrl: string;
}

function toInt(v: string | undefined): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetch and aggregate NORS foodborne-outbreak history for a matched pathogen.
 * Groups by year via SoQL, builds an ascending per-year series, and derives the
 * last-10-year averages. Returns null when the pathogen has no NORS term, on an
 * empty result, a non-OK response, or any thrown error — the caller treats
 * "no coverage" and "fetch failed" identically and drops the band.
 */
export async function fetchPathogenHistory(
  pathogenId: string,
  signal?: AbortSignal
): Promise<OutbreakHistory | null> {
  const term = NORS_TERMS[pathogenId];
  if (!term) return null;

  try {
    const params = new URLSearchParams();
    params.set("$select", "year,count(1),sum(illnesses)");
    params.set("$where", `etiology like '%${term}%' AND primary_mode='Food'`);
    params.set("$group", "year");
    params.set("$order", "year");
    const res = await fetch(`${BASE}?${params.toString()}`, { signal });
    if (!res.ok) return null;
    const rows: RawNorsRow[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const byYear: OutbreakYear[] = rows
      .map((r) => ({
        year: toInt(r.year),
        outbreaks: toInt(r.count_1),
        illnesses: toInt(r.sum_illnesses),
      }))
      .filter((r) => r.year > 0)
      .sort((a, b) => a.year - b.year);

    if (byYear.length === 0) return null;

    const recent = byYear.slice(-10);
    const round = (n: number) => Math.round(n);
    const avgOutbreaksPerYear = round(
      recent.reduce((s, r) => s + r.outbreaks, 0) / recent.length
    );
    const avgIllnessesPerYear = round(
      recent.reduce((s, r) => s + r.illnesses, 0) / recent.length
    );

    return {
      byYear,
      recent,
      avgOutbreaksPerYear,
      avgIllnessesPerYear,
      firstYear: recent[0].year,
      lastYear: recent[recent.length - 1].year,
      sourceUrl:
        "https://data.cdc.gov/Foodborne-Waterborne-and-Related-Diseases/NORS/5xkq-dg7x",
    };
  } catch {
    return null; // graceful no-coverage — never surfaces as an error state
  }
}
