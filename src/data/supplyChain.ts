import type { Recall } from "./types";
import type { ContaminantType } from "./contaminants";
import { fdaEggs, fdaIceberg } from "./outbreaks";
import { extractEstablishments, sameEstablishment } from "./plants";
import { cleanFirmName } from "./avoidance";

/**
 * SUPPLY CHAIN: which company and which plant sit behind the brands on a shelf.
 *
 * The graph reads left to right in four tiers: company → the supplier's plant →
 * the brand on the package → where it was sold. Each link records its evidence:
 *  - "record": the recall notice itself names the link.
 *  - "ownership": a parent company or store brand, from public sources outside
 *    the recall. The UI draws these dashed and shows the source note.
 *
 * Recall detail (hazard in plain words, covered dates, what to do) is
 * hand-verified against each notice and keyed by recall. For FSIS recalls the
 * live feed's status, class, date and link are merged over it when present.
 */

export type Tier = 0 | 1 | 2 | 3;
export const TIER_LABEL: Record<Tier, string> = {
  0: "Company",
  1: "Supplier's plant",
  2: "Brand",
  3: "Store",
};

export interface SupplyNode {
  id: string;
  tier: Tier;
  name: string;
  sub?: string;
  /** Which supplier this node is drawn with; nodes of a group share a band in the map. */
  group: string;
}

export type Evidence = "record" | "ownership";

export interface SupplyEdge {
  from: string;
  to: string;
  evidence: Evidence;
  /** The recall that names this link (record evidence only). */
  recall?: string;
  /** Where an ownership link comes from, in a sentence. */
  note?: string;
}

/** A plant the recall prints USDA numbers for, and the supplier that runs it. */
export interface PlantInfo {
  owner: string;
  establishments: string[];
}

export interface ChainRecall {
  key: string;
  agency: "FSIS" | "FDA";
  /** FSIS recall number, or a short label for an FDA investigation. */
  reference: string;
  /** FSIS recall number to merge live feed fields from. */
  fsisNumber?: string;
  /** ISO date of the notice. */
  date: string;
  classification: "Class I" | "Class II" | "Public Health Alert" | "Outbreak investigation";
  status: string;
  hazard: string;
  hazardType: ContaminantType;
  hazardLabel: string;
  /** Products in one line. */
  summary: string;
  /** The dates or lots the notice covers. */
  window?: string;
  /** One extra fact the notice states, such as injuries or illnesses. */
  note?: string;
  action: string;
  url: string;
}

const FSIS = "https://www.fsis.usda.gov/recalls-alerts/";

const RECALLS: ChainRecall[] = [
  {
    key: "hillshire-2025", agency: "FSIS", reference: "030-2025", fsisNumber: "030-2025", date: "2025-09-27",
    classification: "Class I", status: "Completed",
    hazard: "Pieces of wood in the batter", hazardType: "physical", hazardLabel: "Foreign object",
    summary: "About 58 million lb of corn dogs and sausage on a stick",
    window: "Packaged Mar 17 – Sep 26, 2025", note: "5 injuries reported",
    action: "Throw it away or return it for a refund.",
    url: FSIS + "hillshire-brands-company-recalls-corn-dog-and-sausage-a-stick-products-due-possible",
  },
  {
    key: "tyson-2023", agency: "FSIS", reference: "057-2023", fsisNumber: "057-2023", date: "2023-11-04",
    classification: "Class I", status: "Completed",
    hazard: "Foreign matter in the patties", hazardType: "physical", hazardLabel: "Foreign object",
    summary: "Fully cooked Fun Nuggets breaded chicken patties",
    window: "Lots 2483BRV0207–0210, best by Sep 4, 2024",
    action: "Throw it away or return it for a refund.",
    url: FSIS + "tyson-foods-inc--recalls-chicken-patty-product-due-possible-foreign-matter",
  },
  {
    key: "boars-head-2024", agency: "FSIS", reference: "023-2024-EXP", fsisNumber: "023-2024-EXP", date: "2024-07-30",
    classification: "Class I", status: "Completed",
    hazard: "Listeria monocytogenes", hazardType: "biological", hazardLabel: "Bacteria",
    summary: "Deli meats and liverwurst; expanded by about 7 million lb and 71 products",
    window: "Produced May 10 – Jul 29, 2024", note: "Outbreak strain found in liverwurst",
    action: "Don't eat it. Clean fridge surfaces it touched.",
    url: FSIS + "boars-head-provisions-co--expands-recall-ready-eat-meat-and-poultry-products-due",
  },
  {
    key: "iceberg-2026", agency: "FDA", reference: "Cyclospora, iceberg lettuce", date: fdaIceberg.date,
    classification: "Outbreak investigation", status: "Investigation",
    hazard: "Cyclospora", hazardType: "biological", hazardLabel: "Parasite",
    summary: "Iceberg salad and shredded lettuce",
    window: "Best if used by Jul 18 – Aug 3, 2026", note: "Illnesses in 5 states",
    action: "Don't eat it. Throw it away.",
    url: fdaIceberg.url,
  },
  {
    key: "jalapeno-2026", agency: "FSIS", reference: "PHA-08082026-01", fsisNumber: "PHA-08082026-01", date: "2026-08-08",
    classification: "Public Health Alert", status: "Completed",
    hazard: "Salmonella", hazardType: "biological", hazardLabel: "Bacteria",
    summary: "Meat and poultry products made with a recalled jalapeño ingredient",
    window: "See the FSIS product list", note: "FSIS expected more downstream products",
    action: "Don't eat it. Check the FSIS product list.",
    url: FSIS + "fsis-issues-public-health-alert-various-meat-and-poultry-products-containing-fda-0",
  },
  {
    key: "eggs-2026", agency: "FDA", reference: "Salmonella, shell eggs", date: fdaEggs.date,
    classification: "Outbreak investigation", status: "Investigation",
    hazard: "Salmonella", hazardType: "biological", hazardLabel: "Bacteria",
    summary: "About 1.6 million dozen shell eggs",
    note: "Linked to an outbreak",
    action: "Don't eat them. Throw away or return.",
    url: fdaEggs.url,
  },
  {
    key: "perdue-2025", agency: "FSIS", reference: "PHA-01272025-01", fsisNumber: "PHA-01272025-01", date: "2025-01-27",
    classification: "Public Health Alert", status: "Completed",
    hazard: "Product contamination", hazardType: "other", hazardLabel: "See notice",
    summary: "Fully cooked breaded chicken",
    window: "Best if used by 08 26 25",
    action: "Throw it away or return it for a refund.",
    url: FSIS + "fsis-issues-public-health-alert-wegmans-frozen-fully-cooked-chicken-nuggets-due",
  },
  {
    key: "fillo-2024", agency: "FSIS", reference: "PHA-01042024-01", fsisNumber: "PHA-01042024-01", date: "2024-01-05",
    classification: "Public Health Alert", status: "Completed",
    hazard: "Allergen not on the label", hazardType: "allergenic", hazardLabel: "Allergen",
    summary: "Porcini mushroom risotto bites",
    window: "Best by Oct 11, 2024 or Jun 27, 2025", note: "Risk only for people with that allergy",
    action: "If you have food allergies, don't eat it.",
    url: FSIS + "fsis-issues-public-health-alert-frozen-mushroom-risotto-products-due-misbranding-and",
  },
  {
    key: "rajbhog-2025", agency: "FSIS", reference: "PHA-01082025-01", fsisNumber: "PHA-01082025-01", date: "2025-01-08",
    classification: "Public Health Alert", status: "Completed",
    hazard: "Allergen not on the label", hazardType: "allergenic", hazardLabel: "Allergen",
    summary: "Chicken curry empanadas",
    window: "Best by May 21–22, 2026", note: "Risk only for people with that allergy",
    action: "If you have food allergies, don't eat it.",
    url: FSIS + "fsis-issues-public-health-alert-chicken-empanada-products-due-misbranding-and",
  },
];

const n = (group: string, id: string, tier: Tier, name: string, sub?: string): SupplyNode => ({ id, tier, name, sub, group });

/** Groups are drawn top to bottom in this order. */
export const NODES: SupplyNode[] = [
  n("tyson", "tyson", 0, "Tyson Foods, Inc.", "Parent company"),
  n("tyson", "tyson-plant", 1, "Tyson Foods plant", "Plant no. not printed in notice"),
  n("tyson", "hillshire-plant", 1, "Hillshire Brands plant", "Haltom City, TX"),
  n("tyson", "fun-nuggets", 2, "Tyson Fun Nuggets", "Breaded chicken patties"),
  n("tyson", "jimmy-dean", 2, "Jimmy Dean", "Corn dogs, sausage on a stick"),
  n("tyson", "state-fair", 2, "State Fair", "Corn dogs"),
  n("tyson", "fresh-to-you", 2, "Fresh to You", "Corn dogs"),
  n("tyson", "retail-9", 3, "Retail in 9 states", "AL CA IL KY MI OH TN VA WI"),
  n("tyson", "retail-nationwide", 3, "Retail and food service", "Nationwide, incl. DoD"),
  n("tyson", "canteen", 3, "Canteen vending", "Offices and clinics, IL MN WI"),

  n("boars-head", "boars-head", 0, "Boar's Head Provisions", "Recalling firm"),
  n("boars-head", "boars-head-plant", 1, "Boar's Head plant", "Jarratt, VA"),
  n("boars-head", "boars-head-brand", 2, "Boar's Head", "Deli meats, liverwurst"),
  n("boars-head", "old-country", 2, "Old Country", "Deli meats"),
  n("boars-head", "retail-delis", 3, "Retail delis", "Nationwide, some exported"),

  n("taylor", "taylor", 0, "Taylor Farms", "Produce supplier"),
  n("taylor", "taylor-mexico", 1, "Taylor Farms de México", "Iceberg lettuce"),
  n("taylor", "jalapeno", 1, "Jalapeño ingredient", "Recalled by FDA, sold to meat plants"),
  n("taylor", "marketside", 2, "Marketside", "Iceberg salad, shredded lettuce"),
  n("taylor", "greencore", 2, "Greencore USA", "Downstream maker"),
  n("taylor", "bakkavor", 2, "Bakkavor USA", "Downstream maker"),
  n("taylor", "walmart", 3, "Walmart", "Store"),
  n("taylor", "fsis-list", 3, "See FSIS product list", "Brands not in the alert text"),

  n("rajbhog", "rajbhog", 0, "Rajbhog Foods (NJ)", "Maker"),
  n("rajbhog", "rajbhog-plant", 1, "Rajbhog Foods plant"),
  n("rajbhog", "bettergoods", 2, "bettergoods", "Chicken curry empanadas"),

  n("midwest", "midwest", 0, "Midwest Poultry Services", "Egg producer"),
  n("midwest", "midwest-farms", 1, "Midwest Poultry farms", "Texas · shell eggs"),
  n("midwest", "kroger-brand", 2, "Kroger", "Shell eggs"),
  n("midwest", "simple-truth", 2, "Simple Truth", "Shell eggs"),
  n("midwest", "brookshires-brand", 2, "Brookshire's", "Shell eggs"),
  n("midwest", "kroger", 3, "Kroger", "Store"),
  n("midwest", "brookshires", 3, "Brookshire's", "Store"),

  n("perdue", "perdue", 0, "Perdue Foods LLC", "Maker"),
  n("perdue", "perdue-plant", 1, "Perdue Foods plant", "Plant no. not printed in notice"),
  n("perdue", "wegmans-brand", 2, "Wegmans Family Pack", "Breaded chicken"),
  n("perdue", "wegmans", 3, "Wegmans", "Store"),

  n("fillo", "fillo", 0, "The Fillo Factory", "Maker"),
  n("fillo", "fillo-plant-1", 1, "Fillo Factory plant"),
  n("fillo", "fillo-plant-2", 1, "Fillo Factory plant"),
  n("fillo", "wild-fork-brand", 2, "Wild Fork", "Risotto bites"),
  n("fillo", "wild-fork", 3, "Wild Fork", "Store"),
];

/** Plant numbers as each notice prints them, and whose plant it is. */
export const PLANTS: Record<string, PlantInfo> = {
  "hillshire-plant": { owner: "Hillshire Brands", establishments: ["EST-582", "P-894", "EST. 47991"] },
  "boars-head-plant": { owner: "Boar's Head", establishments: ["EST. 12612", "P-12612"] },
  "rajbhog-plant": { owner: "Rajbhog Foods", establishments: ["EST. P33967"] },
  "fillo-plant-1": { owner: "The Fillo Factory", establishments: ["EST. 39896"] },
  "fillo-plant-2": { owner: "The Fillo Factory", establishments: ["EST. 32068"] },
};

const rec = (from: string, to: string, recall: string): SupplyEdge => ({ from, to, evidence: "record", recall });
const own = (from: string, to: string, note: string): SupplyEdge => ({ from, to, evidence: "ownership", note });

export const EDGES: SupplyEdge[] = [
  rec("tyson", "tyson-plant", "tyson-2023"),
  own("tyson", "hillshire-plant", "Hillshire Brands has been part of Tyson Foods since 2014 (company filings)."),
  rec("tyson-plant", "fun-nuggets", "tyson-2023"),
  rec("hillshire-plant", "jimmy-dean", "hillshire-2025"),
  rec("hillshire-plant", "state-fair", "hillshire-2025"),
  rec("hillshire-plant", "fresh-to-you", "hillshire-2025"),
  rec("fun-nuggets", "retail-9", "tyson-2023"),
  rec("jimmy-dean", "retail-nationwide", "hillshire-2025"),
  rec("state-fair", "retail-nationwide", "hillshire-2025"),
  rec("fresh-to-you", "canteen", "hillshire-2025"),

  rec("boars-head", "boars-head-plant", "boars-head-2024"),
  rec("boars-head-plant", "boars-head-brand", "boars-head-2024"),
  rec("boars-head-plant", "old-country", "boars-head-2024"),
  rec("boars-head-brand", "retail-delis", "boars-head-2024"),
  rec("old-country", "retail-delis", "boars-head-2024"),

  rec("taylor", "taylor-mexico", "iceberg-2026"),
  rec("taylor", "jalapeno", "jalapeno-2026"),
  rec("taylor-mexico", "marketside", "iceberg-2026"),
  rec("marketside", "walmart", "iceberg-2026"),
  rec("jalapeno", "greencore", "jalapeno-2026"),
  rec("jalapeno", "bakkavor", "jalapeno-2026"),
  rec("greencore", "fsis-list", "jalapeno-2026"),
  rec("bakkavor", "fsis-list", "jalapeno-2026"),

  rec("rajbhog", "rajbhog-plant", "rajbhog-2025"),
  rec("rajbhog-plant", "bettergoods", "rajbhog-2025"),
  own("bettergoods", "walmart", "bettergoods is Walmart's store brand (Walmart)."),

  rec("midwest", "midwest-farms", "eggs-2026"),
  rec("midwest-farms", "kroger-brand", "eggs-2026"),
  rec("midwest-farms", "simple-truth", "eggs-2026"),
  rec("midwest-farms", "brookshires-brand", "eggs-2026"),
  rec("kroger-brand", "kroger", "eggs-2026"),
  rec("simple-truth", "kroger", "eggs-2026"),
  rec("brookshires-brand", "brookshires", "eggs-2026"),

  rec("perdue", "perdue-plant", "perdue-2025"),
  rec("perdue-plant", "wegmans-brand", "perdue-2025"),
  own("wegmans-brand", "wegmans", "Wegmans Family Pack is Wegmans' store brand."),

  rec("fillo", "fillo-plant-1", "fillo-2024"),
  rec("fillo", "fillo-plant-2", "fillo-2024"),
  rec("fillo-plant-1", "wild-fork-brand", "fillo-2024"),
  rec("fillo-plant-2", "wild-fork-brand", "fillo-2024"),
  own("wild-fork-brand", "wild-fork", "Wild Fork sells under its own label."),
];

export const NODE_BY_ID: Record<string, SupplyNode> = Object.fromEntries(NODES.map((x) => [x.id, x]));

const DOWN: Record<string, string[]> = {};
const UP: Record<string, string[]> = {};
for (const e of EDGES) {
  (DOWN[e.from] ??= []).push(e.to);
  (UP[e.to] ??= []).push(e.from);
}

function walk(start: string, adj: Record<string, string[]>): Set<string> {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) for (const next of adj[stack.pop()!] ?? []) if (!seen.has(next)) (seen.add(next), stack.push(next));
  return seen;
}

/** The chain through a node: everything upstream of it and everything downstream of it. */
export function chainOf(id: string): Set<string> {
  return new Set([...walk(id, UP), ...walk(id, DOWN)]);
}

/** Everything that shares a source with a node: its upstream, then all of their downstream. */
export function familyOf(id: string): Set<string> {
  const fam = new Set<string>();
  for (const u of walk(id, UP)) for (const d of walk(u, DOWN)) fam.add(d);
  return fam;
}

export function edgeOn(e: SupplyEdge, set: Set<string>): boolean {
  return set.has(e.from) && set.has(e.to);
}

/** Merge live FSIS fields (status, class, date, link) over the hand-verified recall detail. */
export function resolveRecalls(fsis: Recall[]): Record<string, ChainRecall> {
  const byNumber = new Map(fsis.map((r) => [r.recallNumber, r]));
  return Object.fromEntries(
    RECALLS.map((r) => {
      const live = r.fsisNumber ? byNumber.get(r.fsisNumber) : undefined;
      if (!live) return [r.key, r];
      const ymd = live.reportDate ?? live.recallInitiationDate;
      return [
        r.key,
        {
          ...r,
          status: live.status || r.status,
          classification: (live.classification as ChainRecall["classification"]) || r.classification,
          date: ymd && /^\d{8}$/.test(ymd) ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : r.date,
          url: live.url || r.url,
        },
      ];
    })
  );
}

/** Recalls on the edges inside a set of nodes, newest first. */
export function recallsIn(set: Set<string>, recalls: Record<string, ChainRecall>): ChainRecall[] {
  const keys = new Set(EDGES.filter((e) => e.recall && edgeOn(e, set)).map((e) => e.recall!));
  return [...keys].map((k) => recalls[k]).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
}

/** Ownership notes on the edges inside a set of nodes. */
export function ownershipNotesIn(set: Set<string>): string[] {
  return EDGES.filter((e) => e.evidence === "ownership" && edgeOn(e, set)).map((e) => e.note!);
}

/** Plants with printed numbers inside a set of nodes. */
export function plantsIn(set: Set<string>): { id: string; plant: PlantInfo }[] {
  return [...set].filter((id) => PLANTS[id]).map((id) => ({ id, plant: PLANTS[id] }));
}

/** "Hillshire Brands" → "Hillshire Brands’"; "Rajbhog Foods" → "Rajbhog Foods’"; "Perdue" → "Perdue’s". */
export function possessive(name: string): string {
  return name + (/s$/.test(name) ? "’" : "’s");
}

/* ----------------------------------------------------------------------------
   Aisle check: answer "who made this?" from a brand, company, store or plant no.
   ------------------------------------------------------------------------- */

/** One recall seen from the shelf: who made it, which plants, which brands. */
export interface ShelfGroup {
  recall: ChainRecall;
  company: string;
  /** Parent company or upstream source, when there is one. */
  parent?: string;
  plantOwner?: string;
  establishments: string[];
  brands: string[];
  stores: string[];
  /** Node ids on this recall's edges, for jumping into the map. */
  nodes: string[];
}

export function shelfGroups(recalls: Record<string, ChainRecall>): ShelfGroup[] {
  return Object.values(recalls)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => {
      const ids = new Set<string>();
      for (const e of EDGES) if (e.recall === r.key) (ids.add(e.from), ids.add(e.to));
      // Ownership links that hang off this recall: a parent above it, a store brand's store below it.
      for (const e of EDGES) {
        if (e.evidence !== "ownership") continue;
        if (ids.has(e.to) || (ids.has(e.from) && NODE_BY_ID[e.from].tier === 2)) (ids.add(e.from), ids.add(e.to));
      }
      const nodes = [...ids].map((id) => NODE_BY_ID[id]);
      const top = nodes.find((x) => x.tier === 0)?.name ?? "";
      const plants = nodes.filter((x) => PLANTS[x.id]);
      const plantOwner = plants[0] ? PLANTS[plants[0].id].owner : undefined;
      const isMaker = (x: SupplyNode) => x.tier === 2 && x.sub === "Downstream maker";
      const makers = nodes.filter(isMaker).map((x) => x.name);
      const company = makers.length ? makers.join(", ") : plantOwner ?? top;
      // Name the parent only when it differs from the maker ("Boar's Head" vs "Boar's Head Provisions" is the same firm).
      const parent = makers.length ? `Ingredient from ${top}` : top.startsWith(company) ? undefined : top;
      return {
        recall: r,
        company,
        parent,
        plantOwner,
        establishments: plants.flatMap((x) => PLANTS[x.id].establishments),
        brands: nodes.filter((x) => x.tier === 2 && !isMaker(x)).map((x) => x.name),
        stores: nodes.filter((x) => x.tier === 3 && x.sub === "Store").map((x) => x.name),
        nodes: [...ids],
      };
    });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function groupMatches(g: ShelfGroup, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  if ([g.company, g.parent ?? "", g.plantOwner ?? "", ...g.brands, ...g.stores].some((h) => norm(h).includes(q))) return true;
  return g.establishments.some((e) => sameEstablishment(query, e));
}

/** The brand a query names exactly, if any. */
export function exactBrand(groups: ShelfGroup[], query: string): { group: ShelfGroup; brand: string } | null {
  const q = norm(query);
  if (!q) return null;
  for (const group of groups) {
    const brand = group.brands.find((b) => norm(b) === q);
    if (brand) return { group, brand };
  }
  return null;
}

/** A recall anywhere in the FSIS feed that printed this plant number. */
export interface PlantHit {
  recall: Recall;
  firm: string;
  establishment: string;
}

/**
 * Look a typed plant number up across the whole FSIS feed, so the check works
 * for every recall that prints one, not only the traced examples.
 */
export function findPlant(query: string, fsis: Recall[]): PlantHit[] {
  if (!/\d/.test(query)) return [];
  const hits: PlantHit[] = [];
  for (const r of fsis) {
    const printed = r.establishments ?? extractEstablishments(r.productDescription);
    const match = printed.find((e) => sameEstablishment(query, e));
    if (match) hits.push({ recall: r, firm: cleanFirmName(r.recallingFirm), establishment: match });
  }
  return hits.sort((a, b) => (b.recall.reportDate ?? "").localeCompare(a.recall.reportDate ?? ""));
}
