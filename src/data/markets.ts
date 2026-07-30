import type { GeoZip, Market } from "./types";
import { haversineMi } from "./geo";
import { searchNear } from "./mapbox";

/**
 * Find farmers markets and produce markets near a ZIP via Mapbox POI search.
 * Throws MapsDisabledError if no token is configured.
 */
export async function findMarketsNear(
  geo: GeoZip,
  radiusMi = 25,
  signal?: AbortSignal
): Promise<Market[]> {
  // A couple of phrasings catch more community markets than one query alone.
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
