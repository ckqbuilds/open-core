/**
 * Self-contained data access for the OpenCORE MCP server. No CORS
 * concerns here — this runs in Node on the user's machine, so it can hit
 * fda.gov and openFDA directly.
 */

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

export async function searchRecalls({ term, classification, status, state, limit = 20 } = {}) {
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
    };
  });
  if (state) {
    const st = state.toUpperCase();
    out = out.filter((r) => r.nationwide || r.states.includes(st));
  }
  return out.slice(0, limit);
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
