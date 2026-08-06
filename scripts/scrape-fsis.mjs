#!/usr/bin/env node
/**
 * Fetch the USDA FSIS meat/poultry recall feed into a static JSON the client
 * can read same-origin — the third regulatory feed alongside FDA CORE outbreaks
 * and openFDA recalls. Run on the same schedule as scrape-outbreaks.mjs.
 *
 * openFDA covers only FDA-regulated food; meat, poultry, and egg recalls live
 * in FSIS, which exposes a JSON recall API. The endpoint sits behind an Akamai
 * WAF that 403s bare/bot requests, so we send browser-like headers (same trick
 * as server/markets.mjs). If the WAF still blocks (e.g. IP reputation), this
 * exits non-zero and the client keeps the last good file.
 *
 * Output: public/fsis-recalls.json  →  served at /fsis-recalls.json
 *
 * Integrity: transcribes what the FSIS notice states (product, reason, class,
 * states, date) plus the official notice URL. No cross-agency linkage is
 * asserted here — that lives in the app's clearly-labeled correlation layer.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://www.fsis.usda.gov/fsis/api/recall/v/1";
const RECALL_BASE = "https://www.fsis.usda.gov";
const OUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../public/fsis-recalls.json");

// Only keep recalls from the last N years — an active tracker shouldn't carry a
// decade of closed notices (mirrors the outbreak/recall recency floor).
const WINDOW_YEARS = 3;
const MAX_RECORDS = 300;

const HEADERS = {
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

// Canonical pathogen ids mirror Pathogen.id in src/data/symptoms.ts so a detected
// recall pathogen can be correlated with an outbreak of the same pathogen.
const PATHOGEN_TERMS = [
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

/** Detect a canonical pathogen id from free recall text, or undefined if none named. */
function detectPathogen(text) {
  const hay = String(text ?? "").toLowerCase();
  for (const [id, terms] of PATHOGEN_TERMS) if (terms.some((t) => hay.includes(t))) return id;
  return undefined;
}

const stripTags = (s) => String(s ?? "").replace(/<[^>]+>/g, " ");
const clean = (s) =>
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
function parseStates(raw) {
  const text = clean(raw) ?? "";
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
  const direct = clean(pick(r, "field_recall_url"));
  if (direct) return toHttps(/^https?:\/\//i.test(direct) ? direct : `${RECALL_BASE}${direct}`);
  for (const f of [pick(r, "field_title"), pick(r, "field_en_press_release")]) {
    const href = (String(f ?? "").match(/href="([^"]+)"/) ?? [])[1];
    if (href) return toHttps(href.startsWith("http") ? href : `${RECALL_BASE}${href}`);
  }
  return null;
}

function normalize(r) {
  const { states, nationwide } = parseStates(pick(r, "field_states", "field_state"));
  const reportDate = toYmd(pick(r, "field_recall_date", "field_year_recall_date"));
  const recallNumber = clean(pick(r, "field_recall_number")) ?? "—";
  const active = /true|active|open/i.test(String(pick(r, "field_active_notice") ?? ""));
  return {
    id: `fsis-${recallNumber}`,
    recallNumber,
    status: active ? "Ongoing" : "Completed",
    classification: clean(pick(r, "field_recall_classification")) ?? "—",
    productDescription:
      clean(pick(r, "field_product_items", "field_prod_items", "field_summary", "field_title")) ??
      "",
    reason: clean(pick(r, "field_recall_reason", "field_recall_type")) ?? "",
    recallingFirm: clean(pick(r, "field_establishment", "field_company_media_contact")) ?? "—",
    distributionPattern: clean(pick(r, "field_states", "field_state")) ?? "",
    distributionStates: states,
    nationwide,
    reportDate,
    recallInitiationDate: reportDate,
    country: "US",
    agency: "FSIS",
    url: recallUrl(r),
    pathogen: detectPathogen(
      [
        clean(pick(r, "field_summary")),
        clean(pick(r, "field_title")),
        clean(pick(r, "field_product_items")),
        clean(pick(r, "field_recall_reason")),
        recallUrl(r),
      ].join(" ")
    ),
  };
}

function floorYmd(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// FSIS returns each recall in English AND Spanish (separate records, same recall
// number). Keep the English one. Scored from the normalized product/reason text
// so it doesn't depend on the API's language field name.
const SPANISH =
  /\b(onzas|libras|gramos|contienen?|envases?|cajas?|paquetes?|estuches?|etiqueta|frescura|pollo|carne\s+de|congelad\w*|listo\s+para|bolsas?|unidades|fecha\s+de|c[oó]digo\s+de\s+lote|transparentes?|vac[ií]o)\b/gi;
const ENGLISH =
  /\b(containing|packages?|cases?|trays?|pouches?|labels?|use\s+by|best\s+by|lb\.|oz\.|ready-to-eat|frozen|chicken|beef|pork|net\s+weight|lot\s+code|bags?)\b/gi;
const count = (re, s) => (s.match(re) ?? []).length;

/** Keep the English record of each recall number; drop Spanish duplicates/stragglers. */
function englishOnly(recalls) {
  const best = new Map();
  const langScore = (r) => count(ENGLISH, `${r.productDescription} ${r.reason}`) - count(SPANISH, `${r.productDescription} ${r.reason}`);
  for (const r of recalls) {
    const key = r.recallNumber || r.id;
    const cur = best.get(key);
    if (!cur || langScore(r) > langScore(cur)) best.set(key, r);
  }
  return [...best.values()].filter((r) => {
    const s = `${r.productDescription} ${r.reason}`;
    return !(count(ENGLISH, s) === 0 && count(SPANISH, s) >= 2);
  });
}

async function main() {
  const res = await fetch(API, { headers: HEADERS });
  if (!res.ok) throw new Error(`FSIS API ${res.status} (WAF may be blocking this host)`);
  const raw = await res.json();
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  if (rows.length === 0) throw new Error("FSIS API returned no rows — schema may have changed");

  // First-run schema check: surface the real field names so mappings can be verified.
  console.log("FSIS sample fields:", Object.keys(rows[0]).join(", "));

  const floor = floorYmd(WINDOW_YEARS);
  const recalls = englishOnly(rows.map(normalize))
    .filter((r) => r.reportDate && r.reportDate >= floor)
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""))
    .slice(0, MAX_RECORDS);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: API,
    sourceLabel: "USDA FSIS Recalls & Public Health Alerts",
    count: recalls.length,
    recalls,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${recalls.length} FSIS recalls to ${OUT_PATH} at ${payload.generatedAt}`);
}

main().catch((err) => {
  console.error("scrape-fsis failed:", err.message);
  process.exit(1);
});
