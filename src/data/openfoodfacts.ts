/**
 * Open Food Facts barcode lookup.
 *
 * IDENTITY ONLY. Open Food Facts answers "what is this product" so we can turn a
 * scanned/typed barcode into a product name + brand. It is NEVER an authority on
 * safety or recalls — FDA and USDA FSIS remain the source of truth. Coverage is
 * community-contributed and uneven, so a miss (null) is expected and handled by
 * callers (fall back to a brand/food search hint, never a dead end).
 *
 * Public API, no key required, sends CORS headers so it runs from the browser.
 */

const BASE = "https://world.openfoodfacts.org/api/v2/product";

/** A product identity resolved from Open Food Facts. Not a safety judgement. */
export interface OffProduct {
  /** The barcode as returned by OFF (normalized digits). */
  code: string;
  /** Product name, when OFF has one. */
  name?: string;
  /** Brand names split from OFF's comma-separated `brands` field. */
  brands: string[];
  /** Small front image, when available. */
  imageUrl?: string;
}

interface RawOffResponse {
  status?: number; // 1 = found, 0 = not found
  code?: string;
  product?: {
    code?: string;
    product_name?: string;
    brands?: string;
    image_front_small_url?: string;
  };
}

/**
 * Resolve a barcode to a product identity, or null when OFF has no record.
 * Tolerates 404 / empty bodies (returns null) rather than throwing so the UI
 * can still run the recall text-match on the raw code.
 */
export async function lookupBarcode(
  code: string,
  signal?: AbortSignal
): Promise<OffProduct | null> {
  const clean = code.replace(/\D/g, "");
  if (!clean) return null;

  const fields = "code,product_name,brands,image_front_small_url";
  const res = await fetch(`${BASE}/${clean}.json?fields=${fields}`, { signal });

  // OFF returns 404 for an unknown barcode — treat as a miss, not an error.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts request failed: ${res.status}`);

  const data = (await res.json()) as RawOffResponse;
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const brands = (p.brands ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  return {
    code: p.code ?? clean,
    name: p.product_name?.trim() || undefined,
    brands,
    imageUrl: p.image_front_small_url || undefined,
  };
}
