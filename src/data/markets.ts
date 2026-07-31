import type { GeoZip, Market, UsdaDirectory } from "./types";
import { haversineMi } from "./geo";
import { searchNear } from "./mapbox";

/** Human-facing metadata for each USDA directory — shared by the filter UI and the explainer. */
export interface DirectoryInfo {
  id: UsdaDirectory;
  /** Short label for filter pills. */
  label: string;
  /** Singular noun for prose, e.g. "on-farm market". */
  noun: string;
  /** One-line explanation for the "What are these?" guide. */
  blurb: string;
}

export const DIRECTORIES: DirectoryInfo[] = [
  {
    id: "farmersmarket",
    label: "Farmers markets",
    noun: "farmers market",
    blurb:
      "A recurring market where multiple vendors sell produce, meat, and other goods directly to the public — usually weekly, in a shared public space.",
  },
  {
    id: "csa",
    label: "Community-Supported Agriculture",
    noun: "CSA",
    blurb:
      "Community-Supported Agriculture. You pay a farm up front for a season and receive a regular box of their harvest. Prepaid, recurring, direct from one farm.",
  },
  {
    id: "onfarmmarket",
    label: "On-farm markets",
    noun: "on-farm market",
    blurb:
      "A farm stand at the farm itself. You drive to the farm and buy the produce it grows, on-site.",
  },
  {
    id: "foodhub",
    label: "Food hubs",
    noun: "food hub",
    blurb:
      "An aggregator that collects products from many local farms and sells or distributes them together. One stop for many farms' goods.",
  },
  {
    id: "agritourism",
    label: "Agritourism",
    noun: "agritourism farm",
    blurb:
      "Farms you visit for the experience — pick-your-own, tours, corn mazes, tastings — not only to buy food.",
  },
];

export const DEFAULT_DIRECTORY: UsdaDirectory = "farmersmarket";

/**
 * USDA local-food listings near a ZIP for a given directory type. Primary source
 * is the USDA Local Food Directories API (via our /api/markets proxy — full
 * directory, real distances). Farmers markets fall back to Mapbox POI search if
 * USDA is unconfigured or empty; the other directories have no POI equivalent,
 * so they return whatever USDA gives (possibly none).
 */
export async function findMarketsNear(
  geo: GeoZip,
  radiusMi = 25,
  signal?: AbortSignal,
  directory: UsdaDirectory = DEFAULT_DIRECTORY
): Promise<Market[]> {
  const usda = await fetchUsdaMarkets(geo, radiusMi, signal, directory);
  if (usda && usda.length > 0) return usda;
  if (directory !== "farmersmarket") return usda ?? [];
  return fetchMapboxMarkets(geo, radiusMi, signal);
}

/** USDA markets via the server proxy. Returns null (→ fallback) on error/empty config. */
async function fetchUsdaMarkets(
  geo: GeoZip,
  radiusMi: number,
  signal: AbortSignal | undefined,
  directory: UsdaDirectory
): Promise<Market[] | null> {
  try {
    const params = new URLSearchParams({
      x: String(geo.lng),
      y: String(geo.lat),
      radius: String(radiusMi),
      directory,
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
      directory: m.directory ?? directory,
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
      directory: "farmersmarket",
      source: "Mapbox",
    });
  }
  return markets.sort((a, b) => (a.distanceMi ?? 0) - (b.distanceMi ?? 0));
}
