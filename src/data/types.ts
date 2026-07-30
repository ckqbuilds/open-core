/** A food recall record, normalized from the openFDA food/enforcement API. */
export interface Recall {
  id: string;
  recallNumber: string;
  status: string; // Ongoing | Completed | Terminated
  classification: string; // Class I | II | III
  productDescription: string;
  reason: string;
  recallingFirm: string;
  distributionPattern: string;
  /** State abbreviations parsed from distributionPattern (best-effort). */
  distributionStates: string[];
  nationwide: boolean;
  recallInitiationDate?: string; // YYYYMMDD
  reportDate?: string; // YYYYMMDD
  city?: string;
  state?: string;
  country?: string;
}

/** A geocoded US ZIP centroid. */
export interface GeoZip {
  zip: string;
  place: string;
  state: string; // full name
  stateAbbr: string;
  lat: number;
  lng: number;
}

/**
 * An entity (retailer or restaurant chain) explicitly named in an official
 * FDA or CDC outbreak/recall record. NEVER inferred from supply chains — every
 * entry carries a citation to the source that named it.
 */
export interface NamedEntity {
  id: string;
  name: string;
  kind: "retailer" | "restaurant";
  /** Why it appears: what the official record says. */
  note: string;
  /** Branded product tied to the recall, if the entity sells one. */
  product?: string;
  /** OSM brand / name tag used to find nearby locations. */
  osmMatch: { key: "brand" | "name"; value: string };
  source: SourceCitation;
}

export interface SourceCitation {
  agency: "FDA" | "CDC";
  label: string;
  url: string;
  date: string; // ISO date the record was published/updated
}

/**
 * One row of the FDA CORE Outbreak Investigation Table, as produced by the
 * scheduled scraper (scripts/scrape-outbreaks.mjs → public/outbreaks.json).
 * This is the live layer — everything here is transcribed straight from the
 * FDA table.
 */
export interface ScrapedOutbreak {
  refId: string;
  pathogen: string;
  vehicle: string;
  datePosted: string | null;
  caseCount: number | null;
  caseCountText: string | null;
  status: "active" | "resolved";
  eventStatus: string; // "Ongoing" | "Ended"
  recallInitiated: boolean;
  advisoryUrl: string | null;
  sourceUrl: string;
}

export interface OutbreakFeed {
  generatedAt: string;
  source: string;
  sourceLabel: string;
  count: number;
  outbreaks: ScrapedOutbreak[];
}

/**
 * A tracked outbreak as shown in the UI. Core fields come from the live FDA
 * table; the optional rich fields come from the hand-verified layer
 * (src/data/outbreaks.ts) and are present only when `detailed` is true.
 * Nothing here is modeled — numbers are transcribed from cited sources.
 */
export interface Outbreak {
  id: string;
  refId?: string; // FDA CORE reference #
  pathogen: string;
  vehicle: string;
  status: "active" | "resolved";
  caseCount: number | null;
  caseCountText?: string | null;
  datePosted?: string | null;
  eventStatus?: string;
  recallInitiated?: boolean;
  advisoryUrl?: string | null;
  sourceUrl?: string;
  /** True when hand-verified detail (named entities, guidance, etc.) exists. */
  detailed: boolean;

  // Rich, hand-verified fields — present only when detailed === true:
  firstIllnessDate?: string; // ISO
  lastIllnessDate?: string; // ISO
  hospitalizations?: number;
  deaths?: number;
  statesAffectedCount?: number;
  namedEntities?: NamedEntity[];
  sources?: SourceCitation[];
  guidance?: string[];
}

/** A farmers market near a ZIP. */
export interface Market {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  distanceMi?: number;
  products?: string;
  website?: string;
  source: "USDA" | "OSM" | "Mapbox";
}

/** A physical store/restaurant location found near a ZIP. */
export interface StoreLocation {
  id: string;
  entityId: string;
  name: string;
  kind: "retailer" | "restaurant";
  lat: number;
  lng: number;
  distanceMi: number;
  address?: string;
}
