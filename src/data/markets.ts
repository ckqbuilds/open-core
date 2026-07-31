import type { GeoZip, Market } from "./types";
import { haversineMi } from "./geo";
import { searchNear } from "./mapbox";

/**
 * Farmers markets near a ZIP. Primary source is the USDA Local Food Directories
 * API (via our /api/markets server proxy — full directory, real distances).
 * Falls back to Mapbox POI search if USDA is unconfigured or returns nothing.
 */
export async function findMarketsNear(
  geo: GeoZip,
  radiusMi = 25,
  signal?: AbortSignal
): Promise<Market[]> {
  const usda = await fetchUsdaMarkets(geo, radiusMi, signal);
  if (usda && usda.length > 0) return usda;
  return fetchMapboxMarkets(geo, radiusMi, signal);
}

/** USDA markets via the server proxy. Returns null (→ fallback) on error/empty config. */
async function fetchUsdaMarkets(
  geo: GeoZip,
  radiusMi: number,
  signal?: AbortSignal
): Promise<Market[] | null> {
  try {
    const params = new URLSearchParams({
      x: String(geo.lng),
      y: String(geo.lat),
      radius: String(radiusMi),
    });
    const res = await fetch(`/api/markets?${params}`, { signal });
    if (!res.ok) return null; // 503 (no key) / 502 (USDA error) → fall back
    const data = await res.json();
    const rows: Market[] = (data.markets ?? []).map((m: Market) => ({
      id: m.id,
      name: m.name,
      address: m.address ?? undefined,
      lat: m.lat,
      lng: m.lng,
      distanceMi: m.distanceMi ?? undefined,
      products: m.products ?? undefined,
      website: m.website ?? undefined,
      phone: m.phone ?? undefined,
      updatedAt: m.updatedAt ?? undefined,
      source: "USDA",
    }));
    return rows;
  } catch {
    return null;
  }
}

/** Mapbox POI fallback. */
async function fetchMapboxMarkets(
  geo: GeoZip,
  radiusMi: number,
  signal?: AbortSignal
): Promise<Market[]> {
  const queries = ["farmers market", "farmstand produce market"];
  const batches = await Promise.all(
    queries.map((q) => searchNear(q, geo, { limit: 10, bboxRadiusMi: radiusMi, signal }))
  );

  const seen = new Set<string>();
  const markets: Market[] = [];
  for (const r of batches.flat()) {
    const dedupeKey = `${r.name.toLowerCase()}@${r.lat.toFixed(3)},${r.lng.toFixed(3)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const distanceMi = haversineMi(geo, r);
    if (distanceMi > radiusMi) continue;
    markets.push({
      id: r.id,
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      distanceMi,
      products: r.category,
      source: "Mapbox",
    });
  }
  return markets.sort((a, b) => (a.distanceMi ?? 0) - (b.distanceMi ?? 0));
}
