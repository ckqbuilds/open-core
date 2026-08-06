import type { Pathogen } from "./symptoms";

/**
 * CDC BEAM Dashboard serotype surveillance (Socrata dataset `fvm6-ic5r` on
 * data.cdc.gov). BEAM sends CORS headers and needs no key, so — like
 * src/data/openfda.ts — this runs directly from the browser (rate-limited).
 *
 * Integrity: this layer only supplies SOURCED surveillance history for a
 * Salmonella serotype (which foods it has historically been linked to). It
 * never invents serotype-specific claims — when a serotype has no coverage the
 * fetch resolves to null and the UI simply omits the layer.
 *
 * Future hardening: front this with a small server proxy + a Socrata app token
 * (mirroring the openFDA proxy option) if browser rate limits become a problem.
 */

const BASE = "https://data.cdc.gov/resource/fvm6-ic5r.json";

/** One row of the BEAM `fvm6-ic5r` dataset (all fields arrive as strings). */
interface RawBeamRow {
  ifsaclevel4?: string; // food category
  n_ill?: string; // illnesses
  n_ob?: string; // outbreaks
  serotype?: string;
  pathogen?: string;
}

/**
 * Pull the serotype token out of an outbreak's free-text pathogen by removing
 * the matched genus. Uses the CDC pathogen card's `name` and `matchTerms` to
 * strip the genus (case-insensitive), leaving the strain fingerprint:
 *   "Salmonella Oranienburg" → "Oranienburg"
 *   "E. coli O157:H7"        → "O157:H7"
 * Returns null when nothing meaningful remains (e.g. a bare "Salmonella").
 */
export function extractSerotype(
  pathogenText: string,
  pathogen: Pathogen | null
): string | null {
  let remaining = (pathogenText ?? "").trim();
  if (!remaining) return null;

  // Terms to strip: the card's display name plus its match terms. Longest
  // first so "e. coli" is removed before a bare "coli" could be.
  const genusTerms = pathogen
    ? [pathogen.name, ...pathogen.matchTerms]
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
    : [];

  for (const term of genusTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    remaining = remaining.replace(new RegExp(escaped, "i"), " ");
  }

  // Collapse leftover separators/whitespace.
  const cleaned = remaining.replace(/[\s,;]+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export interface SerotypeFood {
  food: string;
  illnesses: number;
  outbreaks: number;
}

export interface SerotypeContext {
  serotype: string;
  /** Foods this serotype is most linked to in BEAM history, top 4 by illnesses. */
  topFoods: SerotypeFood[];
  totalIllnesses: number;
  totalOutbreaks: number;
  sourceUrl: string;
}

function toInt(v: string | undefined): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetch and aggregate BEAM surveillance history for a Salmonella serotype.
 * Rows are summed by food (`ifsaclevel4`) into illness/outbreak totals. Returns
 * null on empty result, a non-OK response, or any thrown error — the caller
 * treats "no coverage" and "fetch failed" identically and drops the layer.
 */
export async function fetchSerotypeContext(
  serotype: string,
  signal?: AbortSignal
): Promise<SerotypeContext | null> {
  try {
    const params = new URLSearchParams();
    params.set("serotype", serotype);
    params.set("$limit", "500");
    const res = await fetch(`${BASE}?${params.toString()}`, { signal });
    if (!res.ok) return null;
    const rows: RawBeamRow[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const byFood = new Map<string, SerotypeFood>();
    let totalIllnesses = 0;
    let totalOutbreaks = 0;
    for (const row of rows) {
      const food = (row.ifsaclevel4 ?? "").trim();
      if (!food) continue;
      const illnesses = toInt(row.n_ill);
      const outbreaks = toInt(row.n_ob);
      totalIllnesses += illnesses;
      totalOutbreaks += outbreaks;
      const existing = byFood.get(food);
      if (existing) {
        existing.illnesses += illnesses;
        existing.outbreaks += outbreaks;
      } else {
        byFood.set(food, { food, illnesses, outbreaks });
      }
    }

    const topFoods = [...byFood.values()]
      .filter((f) => f.illnesses > 0 || f.outbreaks > 0)
      .sort((a, b) => b.illnesses - a.illnesses)
      .slice(0, 4);

    if (topFoods.length === 0) return null;

    return {
      serotype,
      topFoods,
      totalIllnesses,
      totalOutbreaks,
      sourceUrl: "https://www.cdc.gov/beam/",
    };
  } catch {
    return null; // graceful no-coverage — never surfaces as an error state
  }
}
