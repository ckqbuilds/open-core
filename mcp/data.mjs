/**
 * Self-contained data access for the OpenCORE MCP server. No CORS
 * concerns here — this runs in Node on the user's machine, so it can hit
 * fda.gov and openFDA directly.
 */

// ─── Recency floor ──────────────────────────────────────────────────────────

// An active tracker shouldn't surface a decade of closed notices. Both the
// openFDA query and the FSIS feed are floored to the last N years (mirrors the
// web app's recency floor in src/data/openfda.ts and scripts/scrape-fsis.mjs).
const WINDOW_YEARS = 3;

/** N years ago as an openFDA-style YYYYMMDD string. */
export function floorYmd(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// ─── Pathogen attribution ───────────────────────────────────────────────────

// Canonical pathogen ids mirror Pathogen.id in src/data/symptoms.ts so a
// detected recall/outbreak pathogen can be correlated across feeds. The MCP has
// no symptoms catalog, so detection is a plain substring match on free text.
export const PATHOGEN_TERMS = [
  ["salmonella", ["salmonella"]],
  ["listeria", ["listeria"]],
  ["ecoli", ["e. coli", "e.coli", "escherichia", "stec", "shiga toxin"]],
  ["campylobacter", ["campylobacter"]],
  ["cyclospora", ["cyclospora"]],
  ["norovirus", ["norovirus"]],
  ["hepatitis-a", ["hepatitis a", "hepatitis-a"]],
  ["vibrio", ["vibrio"]],
  ["shigella", ["shigella"]],
];

/** Detect a canonical pathogen id from free text, or undefined if none named. */
export function detectPathogen(text) {
  const hay = String(text ?? "").toLowerCase();
  for (const [id, terms] of PATHOGEN_TERMS) if (terms.some((t) => hay.includes(t))) return id;
  return undefined;
}

// ─── openFDA recalls ────────────────────────────────────────────────────────

const OPENFDA = "https://api.fda.gov/food/enforcement.json";
const STATE_ABBRS = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
  "WI","WY","DC",
]);

function parseStates(pattern = "") {
  const nationwide = /nationwide|all states/i.test(pattern);
  const states = new Set();
  for (const code of pattern.match(/\b[A-Z]{2}\b/g) ?? []) {
    if (STATE_ABBRS.has(code)) states.add(code);
  }
  return { states: [...states], nationwide };
}

async function fdaRecalls({ term, classification, status, state, limit, since }) {
  const clauses = [];
  if (term) {
    const q = term.replace(/"/g, "");
    clauses.push(`((reason_for_recall:"${q}") OR (product_description:"${q}"))`);
  } else {
    clauses.push(
      "((reason_for_recall:cyclospora) OR (reason_for_recall:listeria) OR (reason_for_recall:salmonella) OR (reason_for_recall:\"e. coli\") OR (product_description:lettuce) OR (product_description:spinach))"
    );
  }
  if (classification) clauses.push(`(classification:"${classification}")`);
  if (status) clauses.push(`(status:${status})`);
  // Floor report_date so stale terminated recalls don't surface (mirrors web).
  clauses.push(`(report_date:[${since ?? floorYmd(WINDOW_YEARS)} TO 99991231])`);

  const params = new URLSearchParams({
    search: clauses.join(" AND "),
    limit: String(Math.min(100, Math.max(1, limit * (state ? 4 : 1)))),
    sort: "report_date:desc",
  });
  const res = await fetch(`${OPENFDA}?${params}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`openFDA ${res.status}`);
  const data = await res.json();
  let out = (data.results ?? []).map((r) => {
    const { states, nationwide } = parseStates(r.distribution_pattern);
    return {
      recallNumber: r.recall_number,
      classification: r.classification,
      status: r.status,
      product: r.product_description,
      reason: r.reason_for_recall,
      recallingFirm: r.recalling_firm,
      distribution: nationwide ? "nationwide" : states.join(", ") || r.distribution_pattern,
      nationwide,
      states,
      reportDate: r.report_date,
      agency: "FDA",
      pathogen: detectPathogen(`${r.reason_for_recall ?? ""} ${r.product_description ?? ""}`),
    };
  });
  if (state) {
    const st = state.toUpperCase();
    out = out.filter((r) => r.nationwide || r.states.includes(st));
  }
  return out;
}

/** One normalized FSIS recall reshaped into the flat shape searchRecalls emits. */
function fsisAsRecall(r) {
  return {
    recallNumber: r.recallNumber,
    classification: r.classification,
    status: r.status,
    product: r.productDescription,
    reason: r.reason,
    recallingFirm: r.recallingFirm,
    distribution: r.nationwide ? "nationwide" : r.distributionStates.join(", ") || r.distributionPattern,
    nationwide: r.nationwide,
    states: r.distributionStates,
    reportDate: r.reportDate,
    agency: "FSIS",
    url: r.url,
    pathogen: r.pathogen,
  };
}

/** Client-side filter of FSIS recalls by the same params openFDA is queried with. */
function filterFsis(rows, { term, classification, status, state }) {
  let out = rows;
  if (term) {
    const q = term.toLowerCase();
    out = out.filter(
      (r) =>
        (r.productDescription ?? "").toLowerCase().includes(q) ||
        (r.reason ?? "").toLowerCase().includes(q)
    );
  }
  if (classification) out = out.filter((r) => r.classification === classification);
  if (status) out = out.filter((r) => r.status === status);
  if (state) {
    const st = state.toUpperCase();
    out = out.filter((r) => r.nationwide || r.distributionStates.includes(st));
  }
  return out;
}

/**
 * Search recalls across openFDA (FDA-regulated food) and USDA FSIS
 * (meat/poultry/egg). Both feeds are floored to the last 3 years by default
 * (override with `since`, YYYYMMDD). `agency` ("FDA" | "FSIS") scopes to one
 * feed; default is both. Results are merged and sorted by report date desc.
 */
export async function searchRecalls({
  term,
  classification,
  status,
  state,
  limit = 20,
  agency,
  since,
} = {}) {
  const wantFda = agency !== "FSIS";
  const wantFsis = agency !== "FDA";

  const [fda, fsisRaw] = await Promise.all([
    wantFda ? fdaRecalls({ term, classification, status, state, limit, since }) : [],
    // A WAF block (403) on the FSIS host degrades to FDA-only rather than failing.
    wantFsis ? fetchFsisRecalls({ since }).catch(() => []) : [],
  ]);
  const fsis = wantFsis
    ? filterFsis(fsisRaw, { term, classification, status, state }).map(fsisAsRecall)
    : [];

  return [...fda, ...fsis]
    .sort((a, b) => String(b.reportDate ?? "").localeCompare(String(a.reportDate ?? "")))
    .slice(0, limit);
}

// ─── USDA FSIS recalls (meat / poultry / egg) ───────────────────────────────

// openFDA covers only FDA-regulated food; meat, poultry, and egg recalls live in
// the USDA FSIS recall API. The endpoint sits behind an Akamai WAF that 403s
// bare/bot requests, so we send browser-like headers (same trick as
// server/markets.mjs). Ported from scripts/scrape-fsis.mjs.
const FSIS_API = "https://www.fsis.usda.gov/fsis/api/recall/v/1";
const FSIS_RECALL_BASE = "https://www.fsis.usda.gov";
const MAX_FSIS = 300;

const FSIS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.fsis.usda.gov/recalls",
  "Accept-Language": "en-US,en;q=0.9",
};

const STATE_ABBR = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
};

const stripTags = (s) => String(s ?? "").replace(/<[^>]+>/g, " ");
const fsisClean = (s) =>
  stripTags(s)
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim() || null;

/** First present, non-empty value among candidate keys — tolerant of API drift. */
function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
}

/** "Jun 21, 2024" | "2024-06-21" | ISO → YYYYMMDD. */
function toYmd(raw) {
  if (!raw) return undefined;
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return undefined;
  const d = new Date(t);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** FSIS lists full state names, "Nationwide", or abbreviations — normalize to abbrevs. */
function parseFsisStates(raw) {
  const text = fsisClean(raw) ?? "";
  if (!text) return { states: [], nationwide: false };
  if (/nationwide/i.test(text)) return { states: [], nationwide: true };
  const states = [];
  for (const part of text.split(/[,;/]| and /i)) {
    const name = part.trim();
    if (!name) continue;
    if (/^[A-Z]{2}$/.test(name)) states.push(name);
    else if (STATE_ABBR[name.toLowerCase()]) states.push(STATE_ABBR[name.toLowerCase()]);
  }
  return { states: [...new Set(states)], nationwide: false };
}

/**
 * Official notice URL. FSIS exposes a dedicated field_recall_url (a bare URL or
 * site-relative path); fall back to an anchor href embedded in an HTML field.
 */
function recallUrl(r) {
  const toHttps = (u) => u.replace(/^http:\/\//i, "https://");
  const direct = fsisClean(pick(r, "field_recall_url"));
  if (direct) return toHttps(/^https?:\/\//i.test(direct) ? direct : `${FSIS_RECALL_BASE}${direct}`);
  for (const f of [pick(r, "field_title"), pick(r, "field_en_press_release")]) {
    const href = (String(f ?? "").match(/href="([^"]+)"/) ?? [])[1];
    if (href) return toHttps(href.startsWith("http") ? href : `${FSIS_RECALL_BASE}${href}`);
  }
  return null;
}

function normalizeFsis(r) {
  const { states, nationwide } = parseFsisStates(pick(r, "field_states", "field_state"));
  const reportDate = toYmd(pick(r, "field_recall_date", "field_year_recall_date"));
  const recallNumber = fsisClean(pick(r, "field_recall_number")) ?? "—";
  const active = /true|active|open/i.test(String(pick(r, "field_active_notice") ?? ""));
  return {
    id: `fsis-${recallNumber}`,
    recallNumber,
    status: active ? "Ongoing" : "Completed",
    classification: fsisClean(pick(r, "field_recall_classification")) ?? "—",
    productDescription:
      fsisClean(pick(r, "field_product_items", "field_prod_items", "field_summary", "field_title")) ??
      "",
    reason: fsisClean(pick(r, "field_recall_reason", "field_recall_type")) ?? "",
    recallingFirm: fsisClean(pick(r, "field_establishment", "field_company_media_contact")) ?? "—",
    distributionPattern: fsisClean(pick(r, "field_states", "field_state")) ?? "",
    distributionStates: states,
    nationwide,
    reportDate,
    recallInitiationDate: reportDate,
    country: "US",
    agency: "FSIS",
    url: recallUrl(r),
    pathogen: detectPathogen(
      [
        fsisClean(pick(r, "field_summary")),
        fsisClean(pick(r, "field_title")),
        fsisClean(pick(r, "field_product_items")),
        fsisClean(pick(r, "field_recall_reason")),
        recallUrl(r),
      ].join(" ")
    ),
  };
}

/**
 * Fetch and normalize the USDA FSIS recall feed, floored to the last 3 years
 * (override with `since`, YYYYMMDD) and capped. Each row carries agency "FSIS"
 * and a detected `pathogen` id. Throws if the WAF blocks the request.
 */
export async function fetchFsisRecalls({ since } = {}) {
  const res = await fetch(FSIS_API, { headers: FSIS_HEADERS });
  if (!res.ok) throw new Error(`FSIS API ${res.status} (WAF may be blocking this host)`);
  const raw = await res.json();
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  const floor = since ?? floorYmd(WINDOW_YEARS);
  return rows
    .map(normalizeFsis)
    .filter((r) => r.reportDate && r.reportDate >= floor)
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""))
    .slice(0, MAX_FSIS);
}

// ─── FDA CORE outbreak table (scraped) ──────────────────────────────────────

const CORE_URL =
  "https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks";

const clean = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

export async function listActiveOutbreaks() {
  const res = await fetch(CORE_URL, {
    headers: { "User-Agent": "opencore-mcp/0.1" },
  });
  if (!res.ok) throw new Error(`FDA fetch ${res.status}`);
  const html = await res.text();
  const tables = html.match(
    /<table class="table table-condensed table-bordered">([\s\S]*?)<\/table>/g
  ) ?? [];
  const seen = new Set();
  const out = [];
  for (const table of tables) {
    for (const row of table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? []) {
      const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) ?? []).map(clean);
      if (cells.length < 7 || cells[5] !== "Active") continue;
      const refId = cells[1];
      if (!refId || seen.has(refId)) continue;
      seen.add(refId);
      const caseNum = /^\d+$/.test(cells[4]) ? Number(cells[4]) : null;
      out.push({
        refId,
        datePosted: cells[0],
        pathogen: cells[2],
        vehicle: cells[3] && cells[3] !== "Not Yet Identified" ? cells[3] : "Not yet identified",
        caseCount: caseNum,
        caseCountText: caseNum === null ? cells[4] : null,
        eventStatus: /ended/i.test(cells[6]) ? "Ended" : "Ongoing",
        recallInitiated: /✔|✓/.test(cells[7] ?? ""),
        sourceUrl: CORE_URL,
      });
    }
  }
  return out;
}

// Hand-verified detail (mirrors the app's cited layer), keyed by FDA ref #.
// This mirrors src/data/outbreaks.ts and must be kept in sync by hand — there is
// no shared build step yet, so a new curated outbreak has to be added in both
// places. Consumed by the outbreak and food tools alike.
export const CURATED = {
  "1390": {
    caseCount: 1644,
    hospitalizations: 94,
    deaths: 0,
    statesAffectedCount: 5,
    onset: "2026-05-13 to 2026-07-13",
    named: [
      { name: "Taco Bell", note: "CDC: 1,644 cases reported exposure to Taco Bell (reported exposure point, not the source)." },
      { name: "Walmart", note: "Sells recalled Marketside iceberg salad/shredded lettuce (Taylor Farms recall)." },
      { name: "Taylor Farms de México", note: "Recalling firm / identified lettuce supplier." },
    ],
    sources: [
      "https://www.cdc.gov/cyclosporiasis/outbreaks/07-26/investigation.html",
      "https://www.fda.gov/food/outbreaks-foodborne-illness/investigation-5-state-outbreak-cyclospora-illnesses-iceberg-lettuce-july-2026",
    ],
  },
  "1378": {
    caseCount: 98,
    hospitalizations: 26,
    deaths: 0,
    statesAffectedCount: 17,
    onset: "2025-11-21 to 2026-06-30",
    named: [
      { name: "Kroger", note: "Retailer of recalled Kroger/Simple Truth shell eggs (Midwest Poultry recall)." },
      { name: "Brookshire's", note: "Retailer of recalled Brookshire's shell eggs." },
      { name: "Midwest Poultry Services, L.P.", note: "Recalling firm / common egg source; does not account for all illnesses." },
    ],
    sources: [
      "https://www.fda.gov/food/outbreaks-foodborne-illness/outbreak-investigation-salmonella-eggs-july-2026",
    ],
  },
};

export async function getOutbreakDetail(refId) {
  const active = await listActiveOutbreaks();
  const row = active.find((o) => o.refId === String(refId));
  const detail = CURATED[String(refId)] ?? null;
  if (!row && !detail) return null;
  return { ...(row ?? { refId: String(refId) }), detail };
}

// ─── Mapbox local food resources (optional) ─────────────────────────────────

export function mapboxToken() {
  return process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN || null;
}

async function geocodeZip(zip) {
  const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (!res.ok) return null;
  const d = await res.json();
  const p = d.places?.[0];
  return p ? { place: p["place name"], state: p["state abbreviation"], lat: Number(p.latitude), lng: Number(p.longitude) } : null;
}

export async function findFoodResources(zip) {
  const token = mapboxToken();
  if (!token) {
    return { error: "Set MAPBOX_TOKEN to enable location lookups (farmers markets, named store locations)." };
  }
  const geo = await geocodeZip(zip);
  if (!geo) return { error: `ZIP ${zip} not found.` };

  const search = async (q) => {
    const params = new URLSearchParams({
      q,
      access_token: token,
      proximity: `${geo.lng},${geo.lat}`,
      limit: "8",
      types: "poi",
    });
    const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features ?? []).map((f) => ({
      name: f.properties?.name,
      address: f.properties?.full_address ?? f.properties?.place_formatted,
      lat: f.geometry?.coordinates?.[1],
      lng: f.geometry?.coordinates?.[0],
    }));
  };

  const [markets, walmart, tacoBell] = await Promise.all([
    search("farmers market"),
    search("Walmart"),
    search("Taco Bell"),
  ]);
  return {
    near: `${geo.place}, ${geo.state}`,
    farmersMarkets: markets,
    namedLocations: {
      note: "Walmart and Taco Bell are named in the current FDA/CDC cyclospora record. Listed for awareness — not a judgment that a location is unsafe.",
      Walmart: walmart,
      "Taco Bell": tacoBell,
    },
  };
}
