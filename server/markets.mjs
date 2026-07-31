/**
 * USDA Local Food Directories — farmers markets (server-side).
 *
 * The keyed endpoint (/api/farmersmarket/) returns the full directory with
 * coordinates and a precomputed distance, unlike the partial `data_share`
 * endpoint. The key stays here; the browser calls our /api/markets proxy.
 *
 * Env: USDA_API_KEY
 */

const BASE = "https://www.usdalocalfoodportal.com/api/farmersmarket/";

// Browser-like headers — the portal's WAF 403s bare/bot requests.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.usdalocalfoodportal.com/fe/datasharing/",
};

export function isMarketsConfigured() {
  return Boolean(process.env.USDA_API_KEY);
}

function clean(s) {
  if (!s || s === "None") return null;
  return String(s)
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim() || null;
}

/** Add a scheme when the directory stores a bare domain (e.g. "foo.com"). */
function normalizeUrl(u) {
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

/** Digits-only US phone (the client formats + builds the tel: link). */
function normalizePhone(p) {
  const digits = String(p ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/** Fetch farmers markets within `radius` miles of a lat/lng. */
export async function fetchUsdaMarkets({ x, y, radius = 25 }, signal) {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new Error("USDA_API_KEY not set");

  const params = new URLSearchParams({
    apikey: key,
    x: String(x),
    y: String(y),
    radius: String(radius),
  });
  const res = await fetch(`${BASE}?${params}`, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`USDA API ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

  return rows
    .map((r) => {
      const lat = Number(r.location_y);
      const lng = Number(r.location_x);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: String(r.listing_id ?? `${lat},${lng}`),
        name: r.listing_name ?? "Farmers market",
        address: clean(r.location_address) ?? clean(r.location_street),
        lat,
        lng,
        distanceMi: Number.isFinite(Number(r.distance)) ? Number(r.distance) : null,
        products: clean(r.brief_desc) ?? clean(r.listing_desc),
        website: normalizeUrl(clean(r.media_website)),
        phone: normalizePhone(r.contact_phone),
        updatedAt: clean(r.updatetime),
        source: "USDA",
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.distanceMi ?? 1e9) - (b.distanceMi ?? 1e9));
}
