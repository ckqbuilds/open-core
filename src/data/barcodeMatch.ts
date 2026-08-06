// TODO(integration): upgrade to exact match against recall.upcs once the
// supplier-brand-avoidance feature lands that field. This is a deliberately
// COARSE text match for v1 — good for surfacing a likely hit, never a proof of
// safety. FDA/FSIS recall data remains the only authority; Open Food Facts here
// only supplies the product/brand identity we search against.

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

/**
 * COARSE recall match for the in-store barcode check.
 *
 * A recall is returned if EITHER:
 *  - the raw barcode digits appear verbatim in the recall's product description
 *    or reason (some notices cite UPCs inline), OR
 *  - any brand / product-name token (length ≥ 4, case-insensitive) from the OFF
 *    identity appears in the recall's product description.
 *
 * Coverage is uneven by design; a non-match is NOT a safety guarantee — callers
 * must phrase the negative honestly ("not named in any current recall").
 */
export function matchRecalls(
  off: OffProduct | null,
  code: string,
  recalls: Recall[]
): Recall[] {
  const digits = code.replace(/\D/g, "");
  const tokens = off
    ? Array.from(new Set([...tokenize(off.brands.join(" ")), ...tokenize(off.name ?? "")]))
    : [];

  return recalls.filter((r) => {
    const desc = r.productDescription.toLowerCase();
    const reason = r.reason.toLowerCase();

    if (digits.length >= 8 && (desc.includes(digits) || reason.includes(digits))) {
      return true;
    }
    return tokens.some((t) => desc.includes(t));
  });
}
