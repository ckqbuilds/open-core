// Matches a scanned barcode against the current recall feeds. Two tiers:
//  - EXACT: the code equals a UPC the recall notice lists (recall.upcs), or the
//    code appears verbatim in the notice's code_info — i.e. this exact package.
//  - POSSIBLE: the whole Open Food Facts brand phrase appears (word-bounded) in a
//    recall's product description or recalling firm. Never product-name tokens alone.
// FDA/FSIS recall data is the only authority; Open Food Facts only supplies the
// product/brand identity we search against. A non-match is never a safety proof.

import type { Recall } from "@/data/types";
import type { OffProduct } from "@/data/openfoodfacts";

/** Brands shorter than this, or in the stoplist, are too generic to match on. */
const MIN_BRAND = 4;

const BRAND_STOPLIST = new Set([
  "kitchen", "foods", "food", "farms", "farm", "brand", "brands", "organic", "natural", "fresh",
  "simply", "best", "premium", "choice", "select", "market", "home", "family", "original",
  "company", "products", "product",
]);

/** Max POSSIBLE records returned for display; `possibleTotal` carries the full count. */
export const MAX_POSSIBLE = 5;

function brandPhrases(off: OffProduct | null): string[] {
  if (!off) return [];
  const out = new Set<string>();
  for (const b of off.brands) {
    const tokens = b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const phrase = tokens.join(" ");
    if (phrase.length < MIN_BRAND || BRAND_STOPLIST.has(phrase)) continue;
    out.add(phrase);
  }
  return Array.from(out);
}

/** Whole phrase, word-bounded, case-insensitive, over normalized text. */
function hasPhrase(text: string, phrase: string): boolean {
  const norm = " " + text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(" ") + " ";
  return norm.includes(" " + phrase + " ");
}

function severity(r: Recall): number {
  const c = (r.classification ?? "").toUpperCase();
  return c.includes("III") ? 1 : c.includes("II") ? 2 : c.includes("I") ? 3 : 0;
}

/** Digits only, leading zeros stripped — so UPC-A (12) and EAN-13 (0 + UPC-A) compare equal. */
function normUpc(s: string): string {
  return s.replace(/\D/g, "").replace(/^0+/, "");
}

export interface RecallMatches {
  /** Matched by UPC / code — this specific package. */
  exact: Recall[];
  /** Up to MAX_POSSIBLE records naming the whole brand phrase, highest severity first. */
  possible: Recall[];
  /** Total records naming the brand phrase (may exceed possible.length). */
  possibleTotal: number;
  /** The brand phrase that matched, for a "Show all" search link. */
  possibleBrand: string | null;
}

/**
 * Tiered recall match for the in-store barcode check. Exact (UPC/code) hits take
 * precedence; brand-token hits are surfaced separately as "possible". Coverage is
 * uneven by design — callers must phrase a non-match honestly ("not named in any
 * current recall"), never as "safe".
 */
export function matchRecalls(
  off: OffProduct | null,
  code: string,
  recalls: Recall[]
): RecallMatches {
  const digits = code.replace(/\D/g, "");
  const codeNorm = normUpc(code);
  const phrases = brandPhrases(off);

  const exact: Recall[] = [];
  const possible: Recall[] = [];

  for (const r of recalls) {
    const upcHit =
      codeNorm.length >= 8 && (r.upcs ?? []).some((u) => normUpc(u) === codeNorm);
    const inlineHit =
      digits.length >= 8 &&
      ((r.codeInfo ?? "").includes(digits) ||
        r.productDescription.includes(digits) ||
        r.reason.includes(digits));

    if (upcHit || inlineHit) {
      exact.push(r);
      continue;
    }
    const hay = `${r.productDescription} ${r.recallingFirm ?? ""}`;
    if (phrases.some((p) => hasPhrase(hay, p))) possible.push(r);
  }

  const possibleBrand = phrases.find((p) => possible.some((r) => hasPhrase(`${r.productDescription} ${r.recallingFirm ?? ""}`, p))) ?? null;
  possible.sort((a, b) => severity(b) - severity(a));
  return { exact, possible: possible.slice(0, MAX_POSSIBLE), possibleTotal: possible.length, possibleBrand };
}
