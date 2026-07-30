import type { GeoZip, NamedEntity, StoreLocation } from "./types";
import { haversineMi } from "./geo";
import { searchNear } from "./mapbox";

/**
 * Find nearby physical locations of FDA/CDC-named entities via Mapbox. We only
 * ever look up entities from the curated, cited registry — this function does
 * not decide what is "risky"; it maps named chains onto a map near a ZIP.
 *
 * Throws MapsDisabledError if no Mapbox token is configured (callers surface a
 * "configure Mapbox" state instead of erroring hard).
 */
export async function findNamedStoresNear(
  geo: GeoZip,
  entities: NamedEntity[],
  radiusMi = 25,
  signal?: AbortSignal
): Promise<StoreLocation[]> {
  const perEntity = await Promise.all(
    entities.map(async (entity) => {
      const query = entity.osmMatch.value; // brand/name term, e.g. "Walmart"
      const results = await searchNear(query, geo, {
        limit: 10,
        bboxRadiusMi: radiusMi,
        signal,
      });
      return results
        .map<StoreLocation>((r) => ({
          id: r.id,
          entityId: entity.id,
          name: r.name,
          kind: entity.kind,
          lat: r.lat,
          lng: r.lng,
          distanceMi: haversineMi(geo, r),
          address: r.address,
        }))
        .filter((s) => s.distanceMi <= radiusMi && nameMatches(s.name, query));
    })
  );

  return perEntity.flat().sort((a, b) => a.distanceMi - b.distanceMi);
}

/** Guard against loose Mapbox matches (e.g. "Walmart Neighborhood Market" ok,
 *  but drop unrelated POIs the geocoder may return once brand hits run out). */
function nameMatches(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.toLowerCase().split(" ")[0]);
}
