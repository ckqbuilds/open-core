/**
 * Client-side Mapbox Search Box wrapper. Uses a URL-restricted PUBLIC token
 * (pk.*) exposed via Vite env — never a secret sk. token. Replaces the public
 * OpenStreetMap Overpass backend, which was too rate-limited to hammer from
 * every visitor's browser.
 *
 * Security note: a pk.* token is designed for client use, but MUST be
 * URL-restricted in the Mapbox dashboard so it can't be reused off your domain.
 */

const FORWARD = "https://api.mapbox.com/search/searchbox/v1/forward";

export function mapboxToken(): string | null {
  const t = import.meta.env.VITE_MAPBOX_TOKEN;
  return t && t.startsWith("pk.") ? t : null;
}

export function isMapsEnabled(): boolean {
  return mapboxToken() !== null;
}

/** Raised when a search is attempted without a configured token. */
export class MapsDisabledError extends Error {
  constructor() {
    super("Mapbox token not configured");
    this.name = "MapsDisabledError";
  }
}

export interface PlaceResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  category?: string;
  brand?: string;
}

interface ForwardFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    poi_category?: string[];
    brand?: string[];
  };
}

/**
 * Forward POI search near a point. `limit` maxes at 10 per Mapbox; results are
 * ranked by proximity. Callers should post-filter by radius and dedupe.
 */
export async function searchNear(
  q: string,
  center: { lat: number; lng: number },
  opts: { limit?: number; bboxRadiusMi?: number; signal?: AbortSignal } = {}
): Promise<PlaceResult[]> {
  const token = mapboxToken();
  if (!token) throw new MapsDisabledError();
  const { limit = 10, bboxRadiusMi, signal } = opts;

  const params = new URLSearchParams({
    q,
    access_token: token,
    proximity: `${center.lng},${center.lat}`,
    limit: String(Math.min(10, limit)),
    types: "poi",
  });
  if (bboxRadiusMi) params.set("bbox", bboxOf(center, bboxRadiusMi));

  const res = await fetch(`${FORWARD}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Mapbox search failed: ${res.status}`);
  const data = await res.json();
  const features: ForwardFeature[] = data.features ?? [];

  const out: PlaceResult[] = [];
  for (const f of features) {
    const coords = f.geometry?.coordinates;
    if (!coords) continue;
    const p = f.properties ?? {};
    out.push({
      id: p.mapbox_id ?? `${coords[0]},${coords[1]}`,
      name: p.name ?? q,
      lat: coords[1],
      lng: coords[0],
      address: p.full_address ?? p.place_formatted,
      category: p.poi_category?.[0],
      brand: p.brand?.[0],
    });
  }
  return out;
}

/** Approximate a bounding box (minLng,minLat,maxLng,maxLat) around a center. */
function bboxOf(center: { lat: number; lng: number }, radiusMi: number): string {
  const dLat = radiusMi / 69; // ~69 mi per degree latitude
  const dLng = radiusMi / (69 * Math.max(0.1, Math.cos((center.lat * Math.PI) / 180)));
  return [
    (center.lng - dLng).toFixed(5),
    (center.lat - dLat).toFixed(5),
    (center.lng + dLng).toFixed(5),
    (center.lat + dLat).toFixed(5),
  ].join(",");
}
