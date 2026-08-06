import type { GeoZip, Market, UsdaDirectory } from "./types";
import { haversineMi } from "./geo";
import { searchNear } from "./mapbox";

/** Human-facing metadata for each USDA directory — shared by the filter UI and the explainer. */
export interface DirectoryInfo {
  id: UsdaDirectory;
  /** Short label for filter pills and badges. */
  label: string;
  /** Singular noun for prose, e.g. "on-farm market". */
  noun: string;
  /** Emoji shown alongside the label on directory-type badges. */
  emoji: string;
  /** One-line explanation for the "What are these?" guide. */
  blurb: string;
}

export const DIRECTORIES: DirectoryInfo[] = [
  {
    id: "farmersmarket",
    label: "Farmers markets",
    noun: "farmers market",
    emoji: "🧺",
    blurb:
      "A recurring market where multiple vendors sell produce, meat, and other goods directly to the public — usually weekly, in a shared public space.",
  },
  {
    id: "csa",
    label: "Community-Supported Agriculture",
    noun: "CSA",
    emoji: "📦",
    blurb:
      "Community-Supported Agriculture. You pay a farm up front for a season and receive a regular box of their harvest. Prepaid, recurring, direct from one farm.",
  },
  {
    id: "onfarmmarket",
    label: "On-farm markets",
    noun: "on-farm market",
    emoji: "🚜",
    blurb:
      "A farm stand at the farm itself. You drive to the farm and buy the produce it grows, on-site.",
  },
  {
    id: "foodhub",
    label: "Food hubs",
    noun: "food hub",
    emoji: "🏬",
    blurb:
      "An aggregator that collects products from many local farms and sells or distributes them together. One stop for many farms' goods.",
  },
  {
    id: "agritourism",
    label: "Agritourism",
    noun: "agritourism farm",
    emoji: "🌾",
    blurb:
      "Farms you visit for the experience — pick-your-own, tours, corn mazes, tastings — not only to buy food.",
  },
];

export const DEFAULT_DIRECTORY: UsdaDirectory = "farmersmarket";

/**
 * A single physical location, merged across every USDA directory it appears in.
 * The same farm is often listed as (say) both a CSA and an on-farm market;
 * `directories` records every type it offers so one tile can show them all.
 */
export interface MergedMarket {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  distanceMi?: number;
  website?: string;
  phone?: string;
  products?: string;
  updatedAt?: string;
  /** Every directory this location appears in, ordered to match `DIRECTORIES`. */
  directories: UsdaDirectory[];
}

/** Directory id → position in `DIRECTORIES`, so merged badges list in a stable order. */
const DIRECTORY_ORDER = new Map<UsdaDirectory, number>(
  DIRECTORIES.map((d, i) => [d.id, i])
);

/** Round a coordinate to ~2 decimals (~1 km) for location bucketing. */
function coordBucket(n: number | undefined): number {
  return Math.round((n ?? 0) * 100) / 100;
}

/**
 * Normalize a listing name for matching: lowercased, whitespace-collapsed,
 * with trailing punctuation and a trailing " llc" stripped.
 */
function normalizedName(name: string): string {
  let s = name.toLowerCase().replace(/\s+/g, " ").trim();
  s = s.replace(/[\s.,;:!?'"()\-]+$/, ""); // trailing punctuation/whitespace
  s = s.replace(/\s+llc$/, ""); // trailing " llc"
  s = s.replace(/[\s.,;:!?'"()\-]+$/, ""); // any punctuation the llc exposed
  return s;
}

/**
 * Fetch every USDA directory at once and merge same-place listings into one
 * `MergedMarket` per location. Individual directory failures contribute nothing
 * rather than failing the whole call. If USDA yields nothing at all (empty or
 * unconfigured), fall back to the Mapbox farmers-market path.
 */
export async function findAllMarketsNear(
  geo: GeoZip,
  radiusMi = 25,
  signal?: AbortSignal
): Promise<MergedMarket[]> {
  const perDirectory = await Promise.all(
    DIRECTORIES.map((d) =>
      fetchUsdaMarkets(geo, radiusMi, signal, d.id)
        .then((rows) => rows ?? [])
        .catch(() => [] as Market[])
    )
  );
  const tagged = perDirectory.flat();
  if (tagged.length > 0) return mergeByLocation(tagged);

  // USDA gave nothing anywhere → Mapbox POI fallback (farmers markets only).
  const fallback = await fetchMapboxMarkets(geo, radiusMi, signal).catch(
    () => [] as Market[]
  );
  return mergeByLocation(fallback);
}

/**
 * Group tagged listings by location (normalized name + ~1 km coordinate bucket)
 * and merge each group into one `MergedMarket`: union of directories (deduped,
 * in `DIRECTORIES` order), best-populated contact fields, minimum distance.
 * A heuristic — when the key differs, listings stay separate rather than risk a
 * wrong merge. Sorted ascending by distance.
 */
export function mergeByLocation(items: Market[]): MergedMarket[] {
  const groups = new Map<string, Market[]>();
  for (const m of items) {
    const key = `${normalizedName(m.name)}@${coordBucket(m.lat)},${coordBucket(m.lng)}`;
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }

  const merged: MergedMarket[] = [];
  for (const group of groups.values()) {
    // Representative = nearest listing; supplies name/coords and anchors distance.
    const rep = group.reduce((best, m) =>
      (m.distanceMi ?? Infinity) < (best.distanceMi ?? Infinity) ? m : best
    );
    // First non-empty value of a field across the group.
    const pick = (field: keyof Market): string | undefined => {
      for (const m of group) {
        const v = m[field];
        if (typeof v === "string" && v.trim() !== "") return v;
      }
      return undefined;
    };
    const directories = [
      ...new Set(
        group
          .map((m) => m.directory)
          .filter((d): d is UsdaDirectory => d != null)
      ),
    ].sort(
      (a, b) => (DIRECTORY_ORDER.get(a) ?? 99) - (DIRECTORY_ORDER.get(b) ?? 99)
    );

    const minDistance = group.reduce(
      (min, m) => Math.min(min, m.distanceMi ?? Infinity),
      Infinity
    );

    merged.push({
      id: rep.id,
      name: rep.name,
      address: pick("address"),
      lat: rep.lat,
      lng: rep.lng,
      distanceMi: Number.isFinite(minDistance) ? minDistance : undefined,
      website: pick("website"),
      phone: pick("phone"),
      products: pick("products"),
      updatedAt: pick("updatedAt"),
      directories,
    });
  }

  return merged.sort(
    (a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity)
  );
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
