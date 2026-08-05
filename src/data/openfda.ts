import type { Recall } from "./types";
import { parseDistributionStates } from "./geo";

const BASE = "https://api.fda.gov/food/enforcement.json";

interface RawEnforcement {
  recall_number?: string;
  status?: string;
  classification?: string;
  product_description?: string;
  reason_for_recall?: string;
  recalling_firm?: string;
  distribution_pattern?: string;
  recall_initiation_date?: string;
  report_date?: string;
  city?: string;
  state?: string;
  country?: string;
}

function normalize(raw: RawEnforcement, idx: number): Recall {
  const pattern = raw.distribution_pattern ?? "";
  const { states, nationwide } = parseDistributionStates(pattern);
  return {
    id: raw.recall_number ?? `recall-${idx}`,
    recallNumber: raw.recall_number ?? "—",
    status: raw.status ?? "Unknown",
    classification: raw.classification ?? "—",
    productDescription: raw.product_description ?? "",
    reason: raw.reason_for_recall ?? "",
    recallingFirm: raw.recalling_firm ?? "—",
    distributionPattern: pattern,
    distributionStates: states,
    nationwide,
    recallInitiationDate: raw.recall_initiation_date,
    reportDate: raw.report_date,
    city: raw.city,
    state: raw.state,
    country: raw.country,
  };
}

export interface FetchRecallsOptions {
  /** openFDA Lucene search expression. */
  search?: string;
  limit?: number;
  signal?: AbortSignal;
}

/**
 * Query the openFDA food enforcement (recall) endpoint. openFDA sends CORS
 * headers, so this runs directly from the browser with no key (rate-limited).
 */
export async function fetchRecalls(opts: FetchRecallsOptions = {}): Promise<Recall[]> {
  const { search, limit = 50, signal } = opts;
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", String(limit));
  params.set("sort", "report_date:desc");

  const res = await fetch(`${BASE}?${params.toString()}`, { signal });
  if (res.status === 404) return []; // openFDA returns 404 for zero matches
  if (!res.ok) throw new Error(`openFDA request failed: ${res.status}`);
  const data = await res.json();
  const results: RawEnforcement[] = data.results ?? [];
  return results.map(normalize);
}

/**
 * Combine Lucene clauses with OR. openFDA treats a bare `+` between clauses as
 * AND, so joining terms that way asks for one record matching *all* of them —
 * which returns nothing (and 500s on malformed terms). We wrap each clause in
 * parens and join with OR; URLSearchParams encodes the spaces for us.
 */
function orClauses(clauses: string[]): string {
  return clauses.map((c) => `(${c})`).join(" OR ");
}

/**
 * Recalls whose reason or product mentions a pathogen/term of interest.
 * `sinceDate` (openFDA YYYYMMDD) floors the report_date so stale recalls —
 * e.g. terminated 2014 Class I recalls — don't surface under a current
 * outbreak. Omit it to search the full history.
 */
export function fetchRecallsByTerm(
  term: string,
  limit = 50,
  signal?: AbortSignal,
  sinceDate?: string
) {
  const q = term.replace(/"/g, "");
  const termClause = orClauses([`reason_for_recall:"${q}"`, `product_description:"${q}"`]);
  const search = sinceDate
    ? `(${termClause}) AND report_date:[${sinceDate} TO 99991231]`
    : termClause;
  return fetchRecalls({ search, limit, signal });
}

/**
 * Recalls whose product description matches any of a food category's terms.
 * ORs `product_description:"<term>"` across the terms, optionally floored to a
 * recency window (openFDA YYYYMMDD). Empty `terms` (the "Other" bucket) yields
 * no query and resolves to []. Used by the food-first detail page.
 */
export function fetchRecallsByFood(
  terms: string[],
  limit = 50,
  signal?: AbortSignal,
  sinceDate?: string
) {
  const clean = terms.map((t) => t.replace(/"/g, "").trim()).filter(Boolean);
  if (clean.length === 0) return Promise.resolve<Recall[]>([]);
  const termClause = orClauses(clean.map((t) => `product_description:"${t}"`));
  const search = sinceDate
    ? `(${termClause}) AND report_date:[${sinceDate} TO 99991231]`
    : termClause;
  return fetchRecalls({ search, limit, signal });
}

/** Recent produce/leafy-green and pathogen recalls relevant to this tracker. */
export function fetchRelevantRecalls(limit = 60, signal?: AbortSignal) {
  const clauses = [
    "reason_for_recall:cyclospora",
    "reason_for_recall:listeria",
    "reason_for_recall:salmonella",
    'reason_for_recall:"e. coli"',
    "product_description:lettuce",
    'product_description:"leafy greens"',
    "product_description:spinach",
  ];
  return fetchRecalls({ search: orClauses(clauses), limit, signal });
}
