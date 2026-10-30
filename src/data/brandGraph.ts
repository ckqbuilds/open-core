import type { Recall } from "./types";
import { classifyRecall, contaminantById } from "./contaminants";
import { cleanFirmName, parseRetailers, repairEncoding, splitProductLines } from "./avoidance";
import { establishmentKey, extractEstablishments } from "./plants";
import type { ChainRecall, PlantInfo, SupplyEdge, SupplyGraph, SupplyNode, Tier } from "./supplyChain";

/**
 * BRAND GRAPH: the supplier map for one searched brand, built live.
 *
 * Solid links come only from official notices that print the brand: the
 * recalling firm → the plant numbers the notice prints → the brand → where the
 * notice says it was sold. Plants also pull in the other recalls in the FSIS
 * feed that print the same number (same plant, other product), quoted as the
 * notice states them; no brand names are parsed out of them.
 *
 * Dashed links come from USDA FoodData Central's `brandOwner`: the parent
 * company that owns the brand, or the store when the owner is a retailer (a
 * store brand). They say who owns the label, never that anything is unsafe.
 */

export interface BrandOwner {
  owner: string;
  /** Products FDC lists under this brand for this owner. */
  products: number;
  fdcId: number;
  example: string;
}

export interface BrandOwners {
  brand: string;
  owners: BrandOwner[];
}

export async function fetchBrandOwners(brand: string, signal?: AbortSignal): Promise<BrandOwners> {
  const res = await fetch(`/api/brand-owners?brand=${encodeURIComponent(brand)}`, { signal });
  if (!res.ok) throw new Error(`Brand owner lookup failed (${res.status})`);
  return res.json();
}

export const FDC_LABEL = "USDA FoodData Central";
export const fdcUrl = (fdcId: number) => `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`;

/** Owner names FDC uses for retailers, so a brand they own reads as that store's brand. */
const RETAILERS: [RegExp, string][] = [
  [/wal-?mart/i, "Walmart"],
  [/\bkroger\b/i, "Kroger"],
  [/\btarget\b/i, "Target"],
  [/costco/i, "Costco"],
  [/albertsons|safeway/i, "Albertsons / Safeway"],
  [/\baldi\b/i, "Aldi"],
  [/trader joe/i, "Trader Joe's"],
  [/\bpublix\b/i, "Publix"],
  [/h-?e-?b\b|h\.e\. butt/i, "H-E-B"],
  [/\bmeijer\b/i, "Meijer"],
  [/whole foods|amazon/i, "Amazon / Whole Foods"],
  [/ahold|delhaize|food lion|stop & shop|giant food|hannaford/i, "Ahold Delhaize stores"],
  [/wegmans/i, "Wegmans"],
  [/hy-?vee/i, "Hy-Vee"],
  [/dollar general/i, "Dollar General"],
  [/sam'?s west|sam'?s club/i, "Sam's Club"],
  [/\bbj'?s wholesale/i, "BJ's"],
  [/winco/i, "WinCo"],
  [/southeastern grocers|winn-?dixie/i, "Winn-Dixie"],
  [/brookshire/i, "Brookshire's"],
  [/\blidl\b/i, "Lidl"],
  [/save mart|raley/i, "Raley's / Save Mart"],
  [/topco/i, "Topco member stores"],
];

export function retailerFor(owner: string): string | null {
  return RETAILERS.find(([re]) => re.test(owner))?.[1] ?? null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const CORP = /\b(inc|llc|l\.l\.c|co|corp|corporation|company|ltd|lp|stores|the)\b\.?/gi;
/** One key per company however it's written: "Tyson Foods, Inc." = "TYSON FOODS INC". */
export const firmKey = (name: string) => norm(name.replace(CORP, ""));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The brand as a whole phrase, tolerant of apostrophes and spacing ("Boars Head" finds "Boar's Head"). */
export function brandPattern(brand: string): RegExp | null {
  const words = brand.trim().split(/\s+/).filter(Boolean);
  if (norm(brand).length < 3) return null;
  const body = words.map((w) => escapeRe(w.replace(/['’]/g, "")).split("").join("['’]?")).join("[\\s-]+");
  return new RegExp(`(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])`, "i");
}

/** Notices that print the brand in the product text or name it as the firm. */
export function recallsNaming(brand: string, recalls: Recall[]): Recall[] {
  const re = brandPattern(brand);
  if (!re) return [];
  return recalls.filter((r) => re.test(repairEncoding(r.productDescription)) || re.test(r.recallingFirm));
}

const ymdToIso = (ymd?: string) => (ymd && /^\d{8}$/.test(ymd) ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : "");

const FDA_LIST = "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts";

/** A live feed record in the shape the map's recall briefs render. */
export function toChainRecall(r: Recall): ChainRecall {
  const c = classifyRecall(r);
  const { lines } = splitProductLines(r.productDescription);
  const first = lines[0]?.text ?? r.productDescription;
  const more = lines.length > 1 ? ` and ${lines.length - 1} more` : "";
  return {
    key: `live:${r.id}`,
    agency: r.agency ?? "FDA",
    reference: r.recallNumber,
    fsisNumber: r.agency === "FSIS" ? r.recallNumber : undefined,
    date: ymdToIso(r.reportDate ?? r.recallInitiationDate),
    classification: (r.classification as ChainRecall["classification"]) || "Class I",
    status: r.status,
    hazard: repairEncoding(r.reason),
    hazardType: c.type,
    hazardLabel: c.subtype ? c.subtype[0].toUpperCase() + c.subtype.slice(1) : contaminantById(c.type).label,
    summary: (first.length > 140 ? first.slice(0, 137) + "…" : first) + more,
    action: c.type === "allergenic" ? "If you have that allergy, don't eat it." : "Don't eat it. Throw it away or return it for a refund.",
    url: r.url ?? FDA_LIST,
  };
}

/** How much of a notice's product text to show for a same-plant product. */
function productLabel(r: Recall): string {
  const quoted = repairEncoding(r.productDescription).match(/[“"]([^”"]{3,60})[”"]/)?.[1];
  const text = quoted ?? splitProductLines(r.productDescription).lines[0]?.text ?? r.productDescription;
  return text.length > 44 ? text.slice(0, 42) + "…" : text;
}

function soldWhere(r: Recall): { name: string; sub?: string } {
  if (r.nationwide) return { name: "Sold nationwide" };
  const states = r.distributionStates ?? [];
  if (states.length === 0) return { name: "Where it was sold", sub: "See the notice" };
  return {
    name: `Sold in ${states.length} state${states.length === 1 ? "" : "s"}`,
    sub: states.length > 9 ? `${states.slice(0, 9).join(" ")} …` : states.join(" "),
  };
}

const SAME_PLANT_CAP = 4;
const OWNER_CAP = 3;
const OWNER_SHARE = 0.1;

export interface BuildInput {
  brand: string;
  /** Live notices that name the brand (FSIS and FDA), not yet de-duplicated against the curated examples. */
  named: Recall[];
  /** The whole FSIS feed, for same-plant lookups. */
  fsis: Recall[];
  owners: BrandOwner[];
  /** Hand-verified chains that already match the brand; drawn as they are. */
  curated?: SupplyGraph;
}

/** The map for one brand: curated chains that match, then live notices, then owner links. */
export function buildBrandGraph({ brand, named, fsis, owners, curated }: BuildInput): SupplyGraph {
  const nodes = new Map<string, SupplyNode>();
  const edges: SupplyEdge[] = [];
  const plants: Record<string, PlantInfo> = {};
  const recalls: Record<string, ChainRecall> = {};
  const add = (n: SupplyNode) => (nodes.has(n.id) ? nodes.get(n.id)! : (nodes.set(n.id, n), n));
  const node = (group: string, id: string, tier: Tier, name: string, sub?: string) => add({ id, tier, name, sub, group });

  if (curated) {
    curated.nodes.forEach(add);
    edges.push(...curated.edges);
    Object.assign(plants, curated.plants);
    Object.assign(recalls, curated.recalls);
  }
  const curatedNumbers = new Set(Object.values(curated?.recalls ?? {}).map((r) => r.fsisNumber).filter(Boolean));
  const live = named.filter((r) => !curatedNumbers.has(r.recallNumber));

  const re = brandPattern(brand);
  // The brand as the notices spell it, unless they shout it ("GREAT VALUE"); else as typed.
  const spelled = live.map((r) => repairEncoding(r.productDescription).match(re!)?.[0]).find(Boolean);
  const display = (spelled && spelled !== spelled.toUpperCase() ? spelled : brand).trim();
  const brandIds: string[] = [];

  for (const r of live) {
    const firm = cleanFirmName(r.recallingFirm) || "Recalling firm";
    const g = `firm:${firmKey(firm)}`;
    const cr = toChainRecall(r);
    recalls[cr.key] = cr;
    const company = node(g, g, 0, firm, "Recalling firm, named in the notice").id;

    const brandId = node(g, `brand:${firmKey(firm)}`, 2, display, "Named in the notice").id;
    if (!brandIds.includes(brandId)) brandIds.push(brandId);

    const printed = r.agency === "FSIS" ? r.establishments ?? extractEstablishments(r.productDescription) : [];
    const plantIds = printed.map((est) => {
      const id = `plant:${establishmentKey(est)}`;
      node(g, id, 1, `${firm} plant`, "USDA plant no. in the notice");
      const p = (plants[id] ??= { owner: firm, establishments: [] });
      if (!p.establishments.includes(est)) p.establishments.push(est);
      return id;
    });
    if (plantIds.length === 0) {
      const id = `plant:${firmKey(firm)}:unprinted`;
      node(g, id, 1, `${firm} plant`, r.agency === "FSIS" ? "Plant no. not printed in notice" : "FDA notices don't print plant numbers");
      plantIds.push(id);
    }
    for (const p of plantIds) {
      edges.push({ from: company, to: p, evidence: "record", recall: cr.key });
      edges.push({ from: p, to: brandId, evidence: "record", recall: cr.key });
    }

    const where = soldWhere(r);
    const soldId = node(g, `sold:${r.id}`, 3, where.name, where.sub).id;
    edges.push({ from: brandId, to: soldId, evidence: "record", recall: cr.key });
    for (const store of parseRetailers(r.distributionPattern)) {
      const id = node(g, `store:${norm(store)}`, 3, store, "Named in the notice").id;
      edges.push({ from: brandId, to: id, evidence: "record", recall: cr.key });
    }
  }

  // Same plant, other product: other FSIS notices that print one of these numbers.
  const liveIds = new Set(live.map((r) => r.id));
  for (const [plantId, info] of Object.entries(plants)) {
    if (!plantId.startsWith("plant:")) continue;
    const keys = new Set(info.establishments.map(establishmentKey));
    const g = nodes.get(plantId)!.group;
    fsis
      .filter((r) => !liveIds.has(r.id) && (r.establishments ?? extractEstablishments(r.productDescription)).some((e) => keys.has(establishmentKey(e))))
      .slice(0, SAME_PLANT_CAP)
      .forEach((r) => {
        const cr = toChainRecall(r);
        recalls[cr.key] = cr;
        const id = node(g, `other:${r.id}`, 2, productLabel(r), `Same plant · FSIS ${r.recallNumber}`).id;
        edges.push({ from: plantId, to: id, evidence: "record", recall: cr.key });
      });
  }

  // Owner links. With no notice naming the brand, the brand still gets a box to hang them on.
  // A licensee with one product (C.H. Guenther's Jimmy Dean gravy mix) isn't who owns the brand.
  const total = owners.reduce((n, o) => n + o.products, 0);
  const top = owners.filter((o) => o.products / total >= OWNER_SHARE).slice(0, OWNER_CAP);
  if (top.length > 0 && brandIds.length === 0) {
    const curatedBrand = [...nodes.values()].find((n) => n.tier === 2 && re?.test(n.name));
    brandIds.push(curatedBrand?.id ?? node("brand", "brand:searched", 2, display, "Not named in a current recall").id);
  }
  const companies = [...nodes.values()].filter((n) => n.tier === 0);
  for (const o of top) {
    const source = { label: FDC_LABEL, url: fdcUrl(o.fdcId) };
    const count = `${o.products} ${display} product${o.products === 1 ? "" : "s"}`;
    const store = retailerFor(o.owner);
    for (const b of brandIds) {
      const g = nodes.get(b)!.group;
      if (store) {
        const id = node(g, `store:${norm(store)}`, 3, store, "Store brand").id;
        edges.push({
          from: b, to: id, evidence: "ownership", source,
          note: `${FDC_LABEL} lists ${o.owner} as the owner of ${count}, so ${display} is ${store}'s store brand.`,
        });
        continue;
      }
      // An owner that is already on the map (the recalling firm, or a curated parent) links to that box.
      const same = companies.find((c) => firmKey(c.name) === firmKey(o.owner));
      const id = same?.id ?? node(g, `owner:${firmKey(o.owner)}`, 0, o.owner, "Brand owner").id;
      if (same && same.group === g) continue; // the firm owns its own brand; nothing to add
      edges.push({
        from: id, to: b, evidence: "ownership", source,
        note: `${FDC_LABEL} lists ${o.owner} as the brand owner of ${count}.`,
      });
    }
  }

  return { nodes: [...nodes.values()], edges, plants, recalls };
}
