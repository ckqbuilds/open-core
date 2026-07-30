import type { NamedEntity, Outbreak, OutbreakFeed, SourceCitation } from "./types";

/**
 * HAND-VERIFIED enrichment layer, keyed by FDA CORE reference number.
 *
 * The live list of outbreaks comes from the scraper (public/outbreaks.json).
 * This file adds the deeper, cited detail — named retailers/restaurants,
 * guidance, hospitalizations, states — for the specific outbreaks we've
 * researched. It is matched onto the live rows by `refId`.
 *
 * Integrity rules:
 *  1. A company appears under `namedEntities` ONLY if an official FDA or CDC
 *     record names it (or names a branded product it sells). No supply-chain
 *     inference.
 *  2. Every number is transcribed from the cited source, not modeled.
 *  3. Every entity and outbreak carries a `source` link the UI must surface.
 *
 * When a new outbreak needs first-class detail, add an entry here keyed by its
 * FDA reference number (see the "Reference #" column of the CORE table).
 */

const cdcCyclospora: SourceCitation = {
  agency: "CDC",
  label: "CDC Cyclosporiasis Outbreak Investigation, July 2026",
  url: "https://www.cdc.gov/cyclosporiasis/outbreaks/07-26/investigation.html",
  date: "2026-07-21",
};
const fdaIceberg: SourceCitation = {
  agency: "FDA",
  label: "FDA: Investigation of 5-State Cyclospora Outbreak — Iceberg Lettuce (July 2026)",
  url: "https://www.fda.gov/food/outbreaks-foodborne-illness/investigation-5-state-outbreak-cyclospora-illnesses-iceberg-lettuce-july-2026",
  date: "2026-07-18",
};
const fdaEggs: SourceCitation = {
  agency: "FDA",
  label: "FDA: Outbreak Investigation of Salmonella — Eggs (July 2026)",
  url: "https://www.fda.gov/food/outbreaks-foodborne-illness/outbreak-investigation-salmonella-eggs-july-2026",
  date: "2026-07-24",
};

const cyclosporaEntities: NamedEntity[] = [
  {
    id: "taco-bell",
    name: "Taco Bell",
    kind: "restaurant",
    note: "Named by CDC: 1,644 people infected with Cyclospora reported exposure to Taco Bell across five states. Restaurant is the reported exposure point, not the contamination source.",
    osmMatch: { key: "brand", value: "Taco Bell" },
    source: cdcCyclospora,
  },
  {
    id: "walmart-marketside",
    name: "Walmart",
    kind: "retailer",
    note: "Sells Marketside-brand iceberg salad and shredded lettuce covered by the Taylor Farms recall (12/24-oz salad, 8/16-oz shredded, Best-If-Used-By 7/18/2026–8/3/2026).",
    product: "Marketside Iceberg Salad / Shredded Lettuce",
    osmMatch: { key: "brand", value: "Walmart" },
    source: fdaIceberg,
  },
  {
    id: "taylor-farms",
    name: "Taylor Farms de México",
    kind: "retailer",
    note: "Recalling firm and identified lettuce supplier. Listed as the supplier in the FDA investigation; issued the voluntary recall of affected iceberg lettuce.",
    product: "Recalled iceberg lettuce (supplier)",
    osmMatch: { key: "name", value: "Taylor Farms" },
    source: fdaIceberg,
  },
];

const eggEntities: NamedEntity[] = [
  {
    id: "kroger-eggs",
    name: "Kroger",
    kind: "retailer",
    note: "Named by FDA as a retailer of recalled shell eggs sold under the Kroger and Simple Truth brands (Midwest Poultry Services recall).",
    product: "Kroger / Simple Truth shell eggs",
    osmMatch: { key: "brand", value: "Kroger" },
    source: fdaEggs,
  },
  {
    id: "brookshires-eggs",
    name: "Brookshire's",
    kind: "retailer",
    note: "Named by FDA as a retailer of recalled shell eggs sold under the Brookshire's brand (Midwest Poultry Services recall).",
    product: "Brookshire's shell eggs",
    osmMatch: { key: "brand", value: "Brookshire's" },
    source: fdaEggs,
  },
  {
    id: "midwest-poultry",
    name: "Midwest Poultry Services, L.P.",
    kind: "retailer",
    note: "Recalling firm and identified common egg source in the FDA traceback. Voluntarily recalled ~1.6 million dozen shell eggs from Texas farms. FDA notes this producer does not account for all illnesses.",
    product: "Recalled shell eggs (supplier)",
    osmMatch: { key: "name", value: "Midwest Poultry" },
    source: fdaEggs,
  },
];

/** Rich detail overlaid onto a live row (matched by FDA reference number). */
export interface CuratedDetail {
  caseCount: number;
  hospitalizations: number;
  deaths: number;
  statesAffectedCount: number;
  firstIllnessDate: string;
  lastIllnessDate: string;
  namedEntities: NamedEntity[];
  sources: SourceCitation[];
  guidance: string[];
}

export const CURATED: Record<string, CuratedDetail> = {
  "1390": {
    caseCount: 1644,
    hospitalizations: 94,
    deaths: 0,
    statesAffectedCount: 5,
    firstIllnessDate: "2026-05-13",
    lastIllnessDate: "2026-07-13",
    namedEntities: cyclosporaEntities,
    sources: [cdcCyclospora, fdaIceberg],
    guidance: [
      "Do not eat recalled Taylor Farms / Marketside iceberg lettuce with Best-If-Used-By dates 7/18/2026–8/3/2026; throw it out or return it.",
      "Cyclospora is a parasite spread by contaminated fresh produce — it is not passed person to person.",
      "Symptoms (watery diarrhea, cramps, fatigue) can start ~1 week after exposure and last weeks; it is treatable with antibiotics.",
      "When in doubt, buy whole heads of lettuce from another source and wash thoroughly, or use the Farmers markets tab.",
    ],
  },
  "1378": {
    caseCount: 98,
    hospitalizations: 26,
    deaths: 0,
    statesAffectedCount: 17,
    firstIllnessDate: "2025-11-21",
    lastIllnessDate: "2026-06-30",
    namedEntities: eggEntities,
    sources: [fdaEggs],
    guidance: [
      "Check egg cartons for the recalled brands — Country Morning, Cal-Maine Sunups, Brookshire's, Simple Truth, and Kroger — with sell-by/best-by dates 7/20/2026–8/17/2026, and discard or return them.",
      "Cook eggs until both yolk and white are firm; avoid raw or runny eggs and batter until the recall clears.",
      "Salmonella symptoms (diarrhea, fever, cramps) usually start 6 hours to 6 days after exposure.",
      "FDA says the recalled eggs do not account for all illnesses, so keep following updates via the source link.",
    ],
  },
};

/** Fallback source shown for live rows that have no curated detail yet. */
const fdaCoreTable: SourceCitation = {
  agency: "FDA",
  label: "FDA CORE Outbreak Investigation Table",
  url: "https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks",
  date: "2026-07-27",
};

function merge(scraped: import("./types").ScrapedOutbreak, detail?: CuratedDetail): Outbreak {
  const base: Outbreak = {
    id: scraped.refId,
    refId: scraped.refId,
    pathogen: scraped.pathogen,
    vehicle: scraped.vehicle,
    status: scraped.status,
    caseCount: scraped.caseCount,
    caseCountText: scraped.caseCountText,
    datePosted: scraped.datePosted,
    eventStatus: scraped.eventStatus,
    recallInitiated: scraped.recallInitiated,
    advisoryUrl: scraped.advisoryUrl,
    sourceUrl: scraped.sourceUrl,
    detailed: false,
    sources: [{ ...fdaCoreTable }],
  };
  if (!detail) return base;
  return {
    ...base,
    detailed: true,
    caseCount: detail.caseCount,
    caseCountText: null,
    hospitalizations: detail.hospitalizations,
    deaths: detail.deaths,
    statesAffectedCount: detail.statesAffectedCount,
    firstIllnessDate: detail.firstIllnessDate,
    lastIllnessDate: detail.lastIllnessDate,
    namedEntities: detail.namedEntities,
    guidance: detail.guidance,
    sources: detail.sources,
  };
}

/** Merge the live scraped feed with hand-verified detail (by reference #). */
export function mergeLiveOutbreaks(feed: OutbreakFeed): Outbreak[] {
  return feed.outbreaks.map((s) => merge(s, CURATED[s.refId]));
}

/**
 * Fallback when the live feed can't be fetched: synthesize outbreaks from the
 * curated layer alone so the rich, cited outbreaks never disappear.
 */
export function curatedFallbackOutbreaks(): Outbreak[] {
  return Object.entries(CURATED).map(([refId, detail]) =>
    merge(
      {
        refId,
        pathogen: refId === "1378" ? "Salmonella" : "Cyclospora",
        vehicle: refId === "1378" ? "Shell eggs" : "Iceberg lettuce",
        status: "active",
        datePosted: null,
        caseCount: detail.caseCount,
        caseCountText: null,
        eventStatus: "Ongoing",
        recallInitiated: true,
        advisoryUrl: detail.sources[0]?.url ?? null,
        sourceUrl: fdaCoreTable.url,
      },
      detail
    )
  );
}

/** All named entities across curated outbreaks (deduped) — for the map. */
export function activeNamedEntities(): NamedEntity[] {
  const seen = new Map<string, NamedEntity>();
  for (const detail of Object.values(CURATED)) {
    for (const e of detail.namedEntities) if (!seen.has(e.id)) seen.set(e.id, e);
  }
  return [...seen.values()];
}
