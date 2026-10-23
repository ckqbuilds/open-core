/**
 * Shelf-recognition digest for recalled products — the brands, package sizes,
 * codes, and where-sold facts a shopper needs to spot a recalled item.
 *
 * Everything here is a RE-PRESENTATION of an official record: openFDA / FSIS
 * recall notices, or a hand-verified CURATED NamedEntity that cites an FDA/CDC
 * record. Nothing is inferred from supply chains — this honors the named-only
 * rule. Records are grouped by recall event (one firm, one recall date) so a
 * recall that FDA files as twenty product lines reads as one recall with
 * twenty lines, not twenty recalls. Pure module, no React.
 */
import type { NamedEntity, Recall, SourceCitation } from "./types";
import { STATE_ABBR } from "./geo";
import { PATHOGENS, matchesOutbreakPathogen } from "./symptoms";

/**
 * Pull UPC/EAN/GTIN barcodes out of free recall text (openFDA `code_info` and
 * `product_description`, or a curated note). Tolerates the separators recalls
 * actually use — hyphen-grouped ("8-50051-82500-4") and space-grouped
 * ("0 12345 67890 5") — strips them to digits, keeps 11–14-digit runs (UPC-A,
 * EAN-13, GTIN-14, and the check-digit-light 11-digit form FDA sometimes
 * prints), and dedupes. Date/lot codes and state lists yield nothing.
 */
export function extractUpcs(...texts: (string | null | undefined)[]): string[] {
  const hay = texts.filter(Boolean).join("  ");
  // A digit, then 9–16 more of {digit | single space/hyphen followed by a
  // digit}. Requiring a digit after each separator keeps runs contiguous, so a
  // barcode split into groups is captured as one token but unrelated numbers
  // separated by punctuation/words are not merged.
  const re = /\d(?:\d|[ -](?=\d)){9,16}/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(hay)) !== null) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length < 11 || digits.length > 14) continue; // drop obvious non-UPCs
    if (seen.has(digits)) continue;
    seen.add(digits);
    out.push(digits);
  }
  return out;
}

/** Generic distribution words that are never a retailer's name. */
const DISTRIBUTION_STOPWORDS = new Set([
  "nationwide", "retail", "retailer", "retailers", "retail store", "retail stores",
  "store", "stores", "distributor", "distributors", "wholesale", "wholesaler",
  "wholesalers", "distribution", "distributed", "product", "products", "online",
  "internet", "web", "via", "through", "sold", "shipped", "available", "sales",
  "foodservice", "food service", "restaurant", "restaurants", "consumer",
  "consumers", "customer", "customers", "location", "locations", "outlet",
  "outlets", "market", "markets", "chain", "chains", "us", "usa", "domestic",
  "foreign", "not applicable",
]);

const RETAILER_BREAKERS = new Set([
  "distribution", "distributed", "limited", "direct", "or", "foreign", "domestic",
  "mexico", "canada", "applicable", "consumer", "consumers", "shipped", "sold", "only",
  "states", "state", "international", "export", "exported",
]);

/**
 * Best-effort retailer names from an official `distribution_pattern`. Most
 * patterns list only states or generic reach ("distributed nationwide"), so
 * this returns [] unless the notice actually names a chain — it splits on list
 * separators and keeps short, capitalized fragments that aren't a state or a
 * generic distribution word. Conservative on purpose: better to show nothing
 * than to invent a store the record didn't name.
 */
export function parseRetailers(pattern: string): string[] {
  if (!pattern) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const parts = pattern
    .replace(/\s+/g, " ")
    .split(/[,;.:()]|\band\b|\bvia\b|\bthrough\b|\bto\b|\bin\b/i);
  for (const raw of parts) {
    const s = raw.replace(/^\s*(the|at|and|of)\s+/i, "").trim().replace(/[.]+$/, "");
    if (!s) continue;
    const words = s.split(" ");
    if (words.length > 5) continue; // a sentence fragment, not a store name
    const low = s.toLowerCase();
    if (DISTRIBUTION_STOPWORDS.has(low)) continue;
    if (STATE_ABBR[low] || /^[A-Z]{2}$/.test(s)) continue; // a state
    if (!/[A-Z]/.test(s.replace(/^[A-Z]{2}$/, ""))) continue; // needs a proper-noun capital
    if (!/[A-Za-z]/.test(words[0])) continue;
    // A generic distribution word anywhere ("Subway distribution limited",
    // "Amazon or direct") means this is reach wording, not a store name.
    if (words.some((w) => RETAILER_BREAKERS.has(w.toLowerCase().replace(/[^a-z]/g, "")))) continue;
    // Drop fragments that are only stopwords + a state (e.g. "retail stores").
    const meaningful = words.some(
      (w) => !DISTRIBUTION_STOPWORDS.has(w.toLowerCase()) && !STATE_ABBR[w.toLowerCase()]
    );
    if (!meaningful) continue;
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(s);
  }
  return out;
}

/* ----------------------------------------------------------------------------
   Text repair — presentation fixes that never change what the record says.
   ------------------------------------------------------------------------- */

/** Undo the few encoding mangles FDA's feed ships ("Jalapen¿o" → "Jalapeño"). */
export function repairEncoding(text: string): string {
  return text
    .replace(/n¿/g, "ñ")
    .replace(/¿(?=[a-z])/g, "ñ")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã©/g, "é")
    .replace(/Ã¡/g, "á")
    .replace(/Ã³/g, "ó")
    .replace(/Ã­/g, "í")
    .replace(/â€™/g, "’")
    .replace(/â€œ|â€\u009d/g, '"');
}

const ROLE_WORDS =
  /\b(vice president|president|director|manager|communications|sales|marketing|media relations|customer service|customer relations|consumer relations|consumer affairs|public relations|quality assurance|regulatory affairs|purchasing|inventory control|food safety|owner|ceo|coo|cfo)\b.*$/i;
const CORP_SUFFIX = /^(inc|llc|l\.?l\.?c|l\.?p|ltd|corp|co|company|corporation|incorporated|limited)\b\.?/i;
/** An org word inside a segment; whatever follows it is the contact person. */
const ORG_TAIL = /\b(Inc|LLC|L\.?L\.?C|L\.?P|Ltd|Corp|Co|Company|Corporation|Group|Foods|Meats|Farms|Bakery|Kitchen|Grocery|Distributors|Products|Brands|Industries|Enterprises|Market|Markets)\b\.?(?=\s+(?!(?:Inc|LLC|Ltd|Corp|Co|Company|Corporation|L\.?P)\b)[A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)*\s*$)/;
const HONORIFIC_NAME = /\b(?:Mr|Ms|Mrs|Dr)\.?\s+[A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)*/g;

/**
 * FSIS fills `recallingFirm` with a press-contact block ("Company Contact Vice
 * President, Communications, Maple Leaf Foods, Inc. Adam Emery 416-… adam@…").
 * Keep the company; drop the person, role, phone, and email. FDA names pass
 * through untouched.
 */
export function cleanFirmName(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  if (!s) return "";
  s = s
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "")
    .replace(/\(?\+?\d[\d\s().-]{7,}\d/g, "")
    .replace(/^company contact\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const kept: string[] = [];
  for (let part of s.replace(HONORIFIC_NAME, "").split(",").map((p) => p.trim()).filter(Boolean)) {
    const suffix = part.match(CORP_SUFFIX);
    if (suffix) {
      kept.push(suffix[0]);
      break; // whatever follows "Inc." is the contact person's name
    }
    // "Trader Joe's Customer Relations" keeps the company and drops the role;
    // a segment that is only a role ("Vice President") is dropped entirely.
    part = part.replace(ROLE_WORDS, "").trim();
    if (!part) continue;
    const tail = part.match(ORG_TAIL);
    if (tail && tail.index !== undefined) part = part.slice(0, tail.index + tail[0].length);
    kept.push(part);
  }
  const out = kept.join(", ").replace(/\s+,/g, ",").trim();
  return out || s;
}

/* ----------------------------------------------------------------------------
   Product lines — one notice often packs many products into one description.
   ------------------------------------------------------------------------- */

/** One product line as the notice states it, with any barcode it carries. */
export interface AvoidanceLine {
  text: string;
  upcs: string[];
  /** Case-pack / bulk packaging: sold to restaurants and food service. */
  wholesale: boolean;
}

/** Case-pack notation ("4/5#", "6/5 lb") or explicit bulk/foodservice wording. */
const WHOLESALE = /\b(?:[2-9]|\d{2,})\/\d+\s?(?:#|lbs?\b)|\b(?:bulk|foodservice|food service|pallet|pal|cs)\b|\bcs\//i;
/** A trailing "Iceberg, Carrots, Red Cabbage products." note about contents. */
const CONTENTS_NOTE = /\s*([A-Z][a-z][A-Za-z ,/]{0,80}?\bproducts?\.?)\s*$/;
/** Pack-size token followed by the start of the next product name. */
const PACK_BOUNDARY = /(\d+\/\d+\s?(?:#|oz|lbs?|ct)\.?)\s+(?=[A-Z][A-Za-z])/g;

/** Remove "UPC <digits>" phrases whose digits are already shown as chips. */
function stripUpcTokens(text: string, upcs: string[]): string {
  let out = text;
  for (const u of upcs) {
    const re = new RegExp(
      String.raw`[,;:]?\s*(?:UPC|EAN|GTIN)\s*[:#]?\s*` + u.split("").join("[ -]?") + String.raw`\b[.,;]?`,
      "gi"
    );
    out = out.replace(re, "");
  }
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim().replace(/[,;]$/, "");
  return out.length >= 4 ? out : text;
}

/**
 * Split a product description into the product lines it lists. Returns the
 * lines plus a contents note when the notice ends with one. Lines keep the
 * notice's own wording; only separators and whitespace are touched.
 */
export function splitProductLines(description: string): {
  lines: AvoidanceLine[];
  contents?: string;
} {
  let text = repairEncoding(description).replace(/\s+/g, " ").trim();
  let contents: string | undefined;
  const note = text.match(CONTENTS_NOTE);
  if (note && !/\d/.test(note[1]) && note[1].split(" ").length <= 8 && note.index! > 0) {
    contents = note[1].replace(/\.$/, "").replace(/\s+products?$/i, "");
    text = text.slice(0, note.index).trim();
  }
  const raw = text
    .replace(PACK_BOUNDARY, "$1\u0000")
    .split(/\u0000|;|•|\n/)
    .map((s) => s.trim().replace(/^[-–,]\s*/, "").replace(/[,]$/, ""))
    .filter((s) => s.length > 2);
  const seen = new Set<string>();
  const lines: AvoidanceLine[] = [];
  for (const t of raw) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const upcs = extractUpcs(t);
    // The barcode renders as its own chip, so drop the notice's inline
    // "UPC 6 81131 32895 1" token rather than printing the number twice.
    const text = upcs.length > 0 ? stripUpcTokens(t, upcs) : t;
    lines.push({ text, upcs, wholesale: upcs.length === 0 && WHOLESALE.test(t) });
  }
  return { lines, contents };
}

/* ----------------------------------------------------------------------------
   Events — one recall, however many product lines FDA filed it as.
   ------------------------------------------------------------------------- */

export interface AvoidanceEvent {
  id: string;
  /** Recalling firm, with FSIS press-contact noise removed. */
  firm: string;
  agency: "FDA" | "FSIS";
  classification?: string;
  status?: string;
  /** YYYYMMDD of the notice (report date, else initiation date). */
  sourceDate?: string;
  url?: string;
  /** FSIS's official retail distribution-list PDF, when the notice carries one. */
  retailListUrl?: string;
  /** How many separate records the agency filed for this event. */
  recordCount: number;
  /** Why, in the notice's words (unique, first one is the headline). */
  reasons: string[];
  /** Product lines sold at consumer size or carrying a barcode. */
  retail: AvoidanceLine[];
  /** Case-pack / bulk lines sold to restaurants and food service. */
  wholesale: AvoidanceLine[];
  /** Contents notes the notice appends ("Iceberg, Carrots, Red Cabbage"). */
  contents: string[];
  upcs: string[];
  states: string[];
  nationwide: boolean;
  /** Distribution wording as stated, unique across the merged records. */
  distribution: string[];
  /** Lot / date code text as stated, unique across the merged records. */
  codes: string[];
  /** Retailers the notice names, if any. */
  retailers: string[];
  /** Canonical ids of the pathogens these records name (Recall.pathogen). */
  pathogens: string[];
  /** Pathogen id shared with an active outbreak the caller passed in, if any. */
  tiedPathogen?: string;
}

/** A curated retailer an FDA/CDC record names as selling a recalled product. */
export interface NamedRetailerItem {
  id: string;
  name: string;
  product?: string;
  note: string;
  /** Whether the record names it as the recalling firm or as a seller. */
  role: "recalling firm" | "retailer";
  source: SourceCitation;
}

export interface AvoidanceDigest {
  events: AvoidanceEvent[];
  retailers: NamedRetailerItem[];
}

const FIRM_NOISE = new Set([
  "inc", "llc", "lp", "l", "p", "ltd", "corp", "co", "company", "corporation", "s",
  "de", "r", "c", "v", "cv", "rl", "sa", "the", "incorporated", "limited",
]);

/** Accent-free, suffix-free firm key so "Taylor Farms de México" matches FDA's spelling. */
function firmKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FIRM_NOISE.has(w))
    .join(" ");
}

function sameFirm(a: string, b: string): boolean {
  const ka = firmKey(a);
  const kb = firmKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.startsWith(kb) || kb.startsWith(ka);
}

function uniq(values: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = v?.replace(/\s+/g, " ").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

const CLASS_RANK: Record<string, number> = { "Class I": 3, "Public Health Alert": 2, "Class II": 1 };

/**
 * Group recall records into events and map curated retailers alongside them.
 * Restaurants named as exposure points are not shelf products and are left to
 * the named-locations map. A curated entity that is itself the recalling firm
 * of a present event is folded into that event rather than repeated.
 */
export function buildAvoidanceDigest(
  recalls: Recall[],
  entities: NamedEntity[] = [],
  /** Pathogen ids of the active outbreaks in scope; matching events sort first. */
  pathogenIds: string[] = []
): AvoidanceDigest {
  const byKey = new Map<string, AvoidanceEvent & { lineKeys: Set<string> }>();

  for (const r of recalls) {
    const firm = cleanFirmName(r.recallingFirm);
    const date = r.recallInitiationDate ?? r.reportDate ?? "";
    const key = `${firmKey(firm)}|${date}`;
    const { lines, contents } = splitProductLines(r.productDescription);
    let ev = byKey.get(key);
    if (!ev) {
      ev = {
        id: `event-${r.id}`,
        firm,
        agency: r.agency ?? "FDA",
        classification: r.classification && r.classification !== "—" ? r.classification : undefined,
        status: r.status,
        sourceDate: r.reportDate ?? r.recallInitiationDate,
        url: r.url,
        retailListUrl: r.retailListUrl,
        recordCount: 0,
        reasons: [],
        retail: [],
        wholesale: [],
        contents: [],
        upcs: [],
        states: [],
        nationwide: false,
        distribution: [],
        codes: [],
        retailers: [],
        pathogens: [],
        lineKeys: new Set(),
      };
      byKey.set(key, ev);
    }
    ev.recordCount += 1;
    // Recall.pathogen is set for some feeds; otherwise read the pathogen the reason itself names.
    const named = r.pathogen
      ? [r.pathogen]
      : PATHOGENS.filter((p) => matchesOutbreakPathogen(p, r.reason)).map((p) => p.id);
    ev.pathogens = uniq([...ev.pathogens, ...named]);
    ev.url ??= r.url;
    ev.retailListUrl ??= r.retailListUrl;
    ev.nationwide ||= r.nationwide;
    ev.reasons = uniq([...ev.reasons, repairEncoding(r.reason).replace(/,(?=\S)/g, ", ")]);
    ev.contents = uniq([...ev.contents, contents]);
    ev.distribution = uniq([...ev.distribution, repairEncoding(r.distributionPattern)]);
    ev.codes = uniq([...ev.codes, r.codeInfo ? repairEncoding(r.codeInfo) : undefined]);
    ev.retailers = uniq([...ev.retailers, ...parseRetailers(r.distributionPattern)]);
    ev.states = uniq([...ev.states, ...r.distributionStates]);
    ev.upcs = uniq([...ev.upcs, ...(r.upcs ?? []), ...extractUpcs(r.codeInfo, r.productDescription)]);
    for (const line of lines) {
      const lk = line.text.toLowerCase();
      if (ev.lineKeys.has(lk)) continue;
      ev.lineKeys.add(lk);
      (line.wholesale ? ev.wholesale : ev.retail).push(line);
    }
  }

  const events: AvoidanceEvent[] = [...byKey.values()]
    .map(({ lineKeys: _drop, ...ev }) => {
      void _drop;
      ev.states.sort();
      ev.tiedPathogen = ev.pathogens.find((id) => pathogenIds.includes(id));
      return ev;
    })
    .sort((a, b) => {
      // Records naming an active outbreak's pathogen lead; everything else keeps its order.
      const ta = a.tiedPathogen ? 1 : 0;
      const tb = b.tiedPathogen ? 1 : 0;
      if (ta !== tb) return tb - ta;
      const ca = CLASS_RANK[a.classification ?? ""] ?? 0;
      const cb = CLASS_RANK[b.classification ?? ""] ?? 0;
      if (ca !== cb) return cb - ca;
      const ra = a.retail.length > 0 ? 1 : 0;
      const rb = b.retail.length > 0 ? 1 : 0;
      if (ra !== rb) return rb - ra;
      return (b.sourceDate ?? "").localeCompare(a.sourceDate ?? "");
    });

  const retailers: NamedRetailerItem[] = entities
    .filter((e) => e.kind === "retailer")
    .filter((e) => !events.some((ev) => sameFirm(ev.firm, e.name)))
    .map((e) => ({
      id: `entity-${e.id}`,
      name: e.name,
      product: e.product,
      note: e.note,
      role: /recalling firm/i.test(e.note) ? "recalling firm" : "retailer",
      source: e.source,
    }));

  return { events, retailers };
}
