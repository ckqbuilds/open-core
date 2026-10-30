/**
 * USDA establishment ("EST.") numbers: the ID FSIS gives every meat, poultry and
 * egg-product plant, printed inside the round mark of inspection on each package.
 * FSIS notices print them in many shapes ("EST. 47991", "EST-582", "P-894",
 * "EST. M/P 7839", "EST. P33967"); these helpers pull them out of a notice and
 * reduce each to a key that matches however a shopper types it.
 */

// "EST" followed by an optional "No.", an optional M/P/V prefix, then the number.
const EST_RE = /\bEST\.?\s*(?:No\.?\s*)?((?:M\/P|[MPV])?\s?-?\s?\d{1,6}[A-Z]?)\b/gi;
// A bare "P-894" / "M-1234" only counts when the notice talks about establishments.
const PREFIXED_RE = /\b([MPV]-\d{1,6}[A-Z]?)\b/g;
const CONTEXT_RE = /\bEST\b|establishment|mark of inspection/i;

/** "EST. P 20935A" → "20935A"; "P-894" → "894"; "86P" stays "86P". */
export function establishmentKey(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/^\s*EST\.?\s*(NO\.?)?/, "")
    .replace(/[^A-Z0-9/]/g, "")
    .replace(/^(M\/P|[MPV])(?=\d)/, "")
    .replace(/\//g, "");
}

/** Tidy one printed number for display: "EST. M/P 7839," → "EST. M/P 7839". */
function tidy(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/[\s,.;]+$/, "").trim();
}

/** Every establishment number a notice prints, in the form it prints them, de-duplicated by key. */
export function extractEstablishments(...texts: (string | null | undefined)[]): string[] {
  const text = texts.filter(Boolean).join(" ");
  if (!CONTEXT_RE.test(text)) return [];
  const found = new Map<string, string>();
  for (const m of text.matchAll(EST_RE)) {
    const printed = tidy(`EST. ${m[1].replace(/^\s*-\s*/, "")}`);
    const key = establishmentKey(m[1]);
    if (key && !found.has(key)) found.set(key, printed);
  }
  for (const m of text.matchAll(PREFIXED_RE)) {
    const key = establishmentKey(m[1]);
    if (key && !found.has(key)) found.set(key, m[1]);
  }
  return [...found.values()];
}

/** True when what someone typed is the same plant as a printed number. */
export function sameEstablishment(typed: string, printed: string): boolean {
  const a = establishmentKey(typed);
  return a.length > 0 && a === establishmentKey(printed);
}
