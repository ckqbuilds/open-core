/**
 * Shelf-recognition digest for recalled products — the brands, package codes,
 * and where-sold facts a shopper needs to spot a recalled item on the shelf.
 *
 * Everything here is a RE-PRESENTATION of an official record: openFDA / FSIS
 * recall notices, or a hand-verified CURATED NamedEntity that cites an FDA/CDC
 * record. Nothing is inferred from supply chains — this honors the named-only
 * rule. Pure module, no React, so the extractors stay unit-testable.
 */
import type { NamedEntity, Recall } from "./types";
import { STATE_ABBR } from "./geo";

/**
 * Pull UPC/EAN/GTIN barcodes out of free recall text (openFDA `code_info` and
 * `product_description`, or a curated note). Tolerates the separators recalls
 * actually use — hyphen-grouped ("8-50051-82500-4") and space-grouped
 * ("0 12345 67890 5") — strips them to digits, keeps 11–14-digit runs (UPC-A,
 * EAN-13, GTIN-14, and the check-digit-light 11-digit form FDA sometimes
 * prints), and dedupes. Date/lot codes and state lists yield nothing.
 */
export function extractUpcs(...texts: (string | null | undefined)[]): string[] {
  const hay = texts.filter(Boolean).join("  ");
  // A digit, then 9–16 more of {digit | single space/hyphen followed by a
  // digit}. Requiring a digit after each separator keeps runs contiguous, so a
  // barcode split into groups is captured as one token but unrelated numbers
  // separated by punctuation/words are not merged.
  const re = /\d(?:\d|[ -](?=\d)){9,16}/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(hay)) !== null) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length < 11 || digits.length > 14) continue; // drop obvious non-UPCs
    if (seen.has(digits)) continue;
    seen.add(digits);
    out.push(digits);
  }
  return out;
}

/** Generic distribution words that are never a retailer's name. */
const DISTRIBUTION_STOPWORDS = new Set([
  "nationwide", "retail", "retailer", "retailers", "retail store", "retail stores",
  "store", "stores", "distributor", "distributors", "wholesale", "wholesaler",
  "wholesalers", "distribution", "distributed", "product", "products", "online",
  "internet", "web", "via", "through", "sold", "shipped", "available", "sales",
  "foodservice", "food service", "restaurant", "restaurants", "consumer",
  "consumers", "customer", "customers", "location", "locations", "outlet",
  "outlets", "market", "markets", "chain", "chains", "us", "usa",
]);

/**
 * Best-effort retailer names from an official `distribution_pattern`. Most
 * patterns list only states or generic reach ("distributed nationwide"), so
 * this returns [] unless the notice actually names a chain — it splits on list
 * separators and keeps short, capitalized fragments that aren't a state or a
 * generic distribution word. Conservative on purpose: better to show nothing
 * than to invent a store the record didn't name.
 */
export function parseRetailers(pattern: string): string[] {
  if (!pattern) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const parts = pattern
    .replace(/\s+/g, " ")
    .split(/[,;.:]|\band\b|\bvia\b|\bthrough\b|\bto\b|\bin\b/i);
  for (const raw of parts) {
    const s = raw.replace(/^\s*(the|at|and|of)\s+/i, "").trim().replace(/[.]+$/, "");
    if (!s) continue;
    const words = s.split(" ");
    if (words.length > 5) continue; // a sentence fragment, not a store name
    const low = s.toLowerCase();
    if (DISTRIBUTION_STOPWORDS.has(low)) continue;
    if (STATE_ABBR[low] || /^[A-Z]{2}$/.test(s)) continue; // a state
    if (!/[A-Z]/.test(s.replace(/^[A-Z]{2}$/, ""))) continue; // needs a proper-noun capital
    if (!/[A-Za-z]/.test(words[0])) continue;
    // Drop fragments that are only stopwords + a state (e.g. "retail stores").
    const meaningful = words.some(
      (w) => !DISTRIBUTION_STOPWORDS.has(w.toLowerCase()) && !STATE_ABBR[w.toLowerCase()]
    );
    if (!meaningful) continue;
    const key = low;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * The shelf-recognition facts for one recalled product, from whichever official
 * source named it. Curated (NamedEntity) and live (Recall) inputs both map into
 * this shape so they render through one card.
 */
export interface AvoidanceItem {
  id: string;
  /** The recalling firm / named company. */
  firm: string;
  /** Brand + product as the notice describes it. */
  product: string;
  /** Normalized UPCs disclosed by the notice (may be empty). */
  upcs: string[];
  /** Retailers the record names it was sold at / as (may be empty). */
  retailers: string[];
  /** State abbreviations of distribution. */
  states: string[];
  nationwide: boolean;
  /** FDA/FSIS classification, when the source is a recall. */
  classification?: string;
  agency: "FDA" | "FSIS" | "CDC";
  /** Link to the official notice, when one exists. */
  url?: string;
  /** Display date of the source record. */
  sourceDate?: string;
}

/** Map a normalized recall record to its shelf-recognition digest. */
export function toAvoidanceItem(recall: Recall): AvoidanceItem {
  const upcs =
    recall.upcs && recall.upcs.length > 0
      ? recall.upcs
      : extractUpcs(recall.codeInfo, recall.productDescription);
  return {
    id: recall.id,
    firm: recall.recallingFirm,
    product: recall.productDescription,
    upcs,
    retailers: parseRetailers(recall.distributionPattern),
    states: recall.distributionStates,
    nationwide: recall.nationwide,
    classification: recall.classification,
    agency: recall.agency ?? "FDA",
    url: recall.url,
    sourceDate: recall.reportDate ?? recall.recallInitiationDate,
  };
}

/**
 * Map hand-verified CURATED named entities (name/brand + product + note +
 * source citation) into the same digest, so a curated outbreak (e.g. Taylor
 * Farms → Walmart Marketside) renders identically to a live recall. UPCs are
 * lifted from the note when it discloses them.
 */
export function avoidanceFromEntities(entities: NamedEntity[]): AvoidanceItem[] {
  return entities.map((e) => ({
    id: `entity-${e.id}`,
    firm: e.name,
    product: e.product ?? e.note,
    upcs: extractUpcs(e.product, e.note),
    retailers: e.kind === "retailer" ? [e.name] : [],
    states: [],
    nationwide: false,
    classification: undefined,
    agency: e.source.agency,
    url: e.source.url,
    // Source citations carry an ISO date; normalize to the YYYYMMDD the shared
    // date formatter expects.
    sourceDate: e.source.date.replace(/\D/g, "").slice(0, 8),
  }));
}

/** Dedupe items that describe the same firm+product (recall + curated overlap). */
export function dedupeAvoidance(items: AvoidanceItem[]): AvoidanceItem[] {
  const seen = new Set<string>();
  const out: AvoidanceItem[] = [];
  for (const it of items) {
    const key = `${it.firm}|${it.product}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/** Class I and UPC-bearing items first — the highest-signal ones to act on. */
export function sortAvoidance(items: AvoidanceItem[]): AvoidanceItem[] {
  const rank = (it: AvoidanceItem) =>
    (it.classification === "Class I" ? 2 : 0) + (it.upcs.length > 0 ? 1 : 0);
  return [...items].sort((a, b) => rank(b) - rank(a));
}
