// Matches a scanned barcode against the current recall feeds. Two tiers:
//  - EXACT: the code equals a UPC the recall notice lists (recall.upcs), or the
//    code appears verbatim in the notice's code_info — i.e. this exact package.
//  - POSSIBLE: a brand/product token from the Open Food Facts identity appears in
//    a recall's product description — same brand, maybe a different item.
// FDA/FSIS recall data is the only authority; Open Food Facts only supplies the
// product/brand identity we search against. A non-match is never a safety proof.

import type { Recall } from "@/data/types";
import type { OffProduct } from "@/data/openfoodfacts";

/** Minimum token length we'll match on, to avoid noise from short words. */
const MIN_TOKEN = 4;

/** Common brand-name filler that would over-match if treated as a token. */
const STOPWORDS = new Set([
  "brand",
  "brands",
  "foods",
  "food",
  "company",
  "products",
  "product",
  "organic",
  "natural",
  "fresh",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TOKEN && !STOPWORDS.has(t));
}

/** Digits only, leading zeros stripped — so UPC-A (12) and EAN-13 (0 + UPC-A) compare equal. */
function normUpc(s: string): string {
  return s.replace(/\D/g, "").replace(/^0+/, "");
}

export interface RecallMatches {
  /** Matched by UPC / code — this specific package. */
  exact: Recall[];
  /** Matched by brand or product name — same brand, verify it's the same item. */
  possible: Recall[];
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
  const tokens = off
    ? Array.from(new Set([...tokenize(off.brands.join(" ")), ...tokenize(off.name ?? "")]))
    : [];

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
    if (tokens.some((t) => r.productDescription.toLowerCase().includes(t))) {
      possible.push(r);
    }
  }

  return { exact, possible };
}
