#!/usr/bin/env node
/**
 * Scrape the FDA CORE Outbreak Investigation Table into a static JSON the
 * client can fetch same-origin. Run on a schedule (cron on the Pi) so the
 * dashboard tracks all live FDA outbreaks without a browser CORS problem —
 * fda.gov sends no CORS headers, so the browser can't fetch it directly, but
 * this server-side script can.
 *
 * Output: public/outbreaks.json  →  served at /outbreaks.json
 *
 * Integrity: this only transcribes what the FDA table states (pathogen,
 * product, case count, status) plus the FDA source URL. Richer detail
 * (named retailers, guidance) stays in the hand-verified layer in
 * src/data/outbreaks.ts, matched to these rows by reference number.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CORE_URL =
  "https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks";
const OUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/outbreaks.json"
);

const stripTags = (s) => s.replace(/<[^>]+>/g, " ");
const unescapeHtml = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
const clean = (s) => unescapeHtml(stripTags(s)).replace(/\s+/g, " ").trim();

function toIso(mdy) {
  const m = mdy.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  return `https://www.fda.gov${href}`;
}

async function main() {
  const res = await fetch(CORE_URL, {
    headers: { "User-Agent": "opencore/1.0 (+public health dashboard)" },
  });
  if (!res.ok) throw new Error(`FDA fetch failed: ${res.status}`);
  const htmlText = await res.text();

  const tables = htmlText.match(
    /<table class="table table-condensed table-bordered">([\s\S]*?)<\/table>/g
  );
  if (!tables) throw new Error("No CORE tables found — page markup may have changed");

  const outbreaks = [];
  const seen = new Set();

  for (const table of tables) {
    const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
    for (const row of rows) {
      const rawCells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) ?? [];
      const cells = rawCells.map((c) => clean(c));
      if (cells.length < 7) continue;
      const investigationStatus = cells[5];
      if (investigationStatus !== "Active") continue; // current investigations only

      const refId = cells[1];
      if (!refId || seen.has(refId)) continue;
      seen.add(refId);

      const caseText = cells[4];
      const caseNum = /^\d+$/.test(caseText) ? Number(caseText) : null;
      const eventStatus = /ended/i.test(cells[6]) ? "Ended" : "Ongoing";
      const recallInitiated = /✔|✓/.test(rawCells[7] ?? "");
      // advisory link, if the event-status cell carries one
      const advHref = (rawCells[6]?.match(/href="([^"]+)"/) ?? [])[1] ?? null;
      const pathogenHref = (rawCells[2]?.match(/href="([^"]+)"/) ?? [])[1] ?? null;

      outbreaks.push({
        refId,
        pathogen: cells[2],
        vehicle: cells[3] && cells[3] !== "Not Yet Identified" ? cells[3] : "Not yet identified",
        datePosted: toIso(cells[0]),
        caseCount: caseNum,
        caseCountText: caseNum === null ? caseText : null,
        status: eventStatus === "Ongoing" ? "active" : "resolved",
        eventStatus,
        recallInitiated,
        advisoryUrl: absUrl(advHref) ?? absUrl(pathogenHref),
        sourceUrl: CORE_URL,
      });
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: CORE_URL,
    sourceLabel: "FDA CORE Outbreak Investigation Table",
    count: outbreaks.length,
    outbreaks,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(
    `Wrote ${outbreaks.length} active investigations to ${OUT_PATH} at ${payload.generatedAt}`
  );
}

main().catch((err) => {
  console.error("scrape-outbreaks failed:", err.message);
  process.exit(1);
});
