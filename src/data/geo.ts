import type { GeoZip } from "./types";

/** US state name → abbreviation, for parsing FDA distribution text. */
export const STATE_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};

const geoCache = new Map<string, GeoZip>();

/**
 * Geocode a US ZIP to a centroid via Zippopotam (free, CORS-enabled, no key).
 * Returns null if the ZIP is unknown or the request fails.
 */
export async function geocodeZip(zip: string, signal?: AbortSignal): Promise<GeoZip | null> {
  const key = zip.trim();
  if (geoCache.has(key)) return geoCache.get(key)!;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${key}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    const geo: GeoZip = {
      zip: key,
      place: place["place name"],
      state: place.state,
      stateAbbr: place["state abbreviation"],
      lat: Number(place.latitude),
      lng: Number(place.longitude),
    };
    geoCache.set(key, geo);
    return geo;
  } catch {
    return null;
  }
}

const EARTH_MI = 3958.8;

/** Great-circle distance between two lat/lng points, in miles. */
export function haversineMi(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_MI * 2 * Math.asin(Math.sqrt(h));
}

/** Parse state abbreviations out of an FDA distributionPattern string. */
export function parseDistributionStates(pattern: string): {
  states: string[];
  nationwide: boolean;
} {
  const lower = pattern.toLowerCase();
  const nationwide = /nationwide|all states|throughout the (?:us|u\.s\.|united states)/.test(lower);
  const states = new Set<string>();
  // Full state names.
  for (const [name, abbr] of Object.entries(STATE_ABBR)) {
    if (lower.includes(name)) states.add(abbr);
  }
  // Bare 2-letter codes (word-bounded, uppercase in original).
  const codeMatches = pattern.match(/\b([A-Z]{2})\b/g) ?? [];
  const valid = new Set(Object.values(STATE_ABBR));
  for (const code of codeMatches) if (valid.has(code)) states.add(code);
  return { states: [...states], nationwide };
}
