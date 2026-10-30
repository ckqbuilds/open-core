/**
 * Brand owners from USDA FoodData Central (server-side).
 *
 * FDC's Branded Foods data comes from the manufacturers' own label submissions
 * (via GS1/Label Insight) and records a `brandOwner` for every product. That is
 * the public, citable source for "who owns this brand": a parent company, or a
 * retailer when the brand is a store brand (Great Value → Wal-Mart Stores).
 * It says nothing about safety; the UI draws these links dashed with the source.
 *
 * Env: FDC_API_KEY (free at api.data.gov). Falls back to DEMO_KEY, which is
 * rate-limited per IP, so results are cached in memory for a day.
 */

const SEARCH = "https://api.nal.usda.gov/fdc/v1/foods/search";
const TTL = 24 * 60 * 60 * 1000;
const cache = new Map();

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Owners of the products FDC labels with this brand, most products first.
 * Only products whose brand name (or, when FDC leaves it blank, description
 * prefix) is the brand count, so "dean" doesn't pick up Jimmy Dean.
 */
export async function fetchBrandOwners(brand, signal) {
  const key = norm(brand);
  if (key.length < 3) return { brand, owners: [] };
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const url = new URL(SEARCH);
  url.searchParams.set("api_key", process.env.FDC_API_KEY || "DEMO_KEY");
  // Unquoted: FDC's front end intermittently 400s a quoted phrase. The brand
  // filter below keeps only products labelled with exactly this brand anyway.
  url.searchParams.set("query", brand.replace(/"/g, ""));
  url.searchParams.set("dataType", "Branded");
  url.searchParams.set("pageSize", "100");
  let res = await fetch(url, { signal });
  if (res.status === 400 || res.status >= 500) res = await fetch(url, { signal });
  if (!res.ok) {
    // DEMO_KEY allows only a handful of calls an hour; serve a stale answer over none.
    if (hit) return hit.value;
    throw new Error(`FoodData Central ${res.status}`);
  }
  const data = await res.json();

  // "Wal-Mart Stores, Inc." and "Wal-Mart Stores Inc." are one owner. An owner
  // field that only repeats the brand ("GREAT VALUE") names no one.
  const owners = new Map();
  for (const f of data.foods ?? []) {
    const labelled = f.brandName ? norm(f.brandName) === key : norm(f.description).startsWith(key);
    if (!labelled || !f.brandOwner || norm(f.brandOwner) === key) continue;
    const id = norm(f.brandOwner);
    const o = owners.get(id) ?? { owner: f.brandOwner.trim(), products: 0, fdcId: f.fdcId, example: f.description };
    o.products += 1;
    owners.set(id, o);
  }
  const value = {
    brand,
    owners: [...owners.values()].sort((a, b) => b.products - a.products),
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
