/**
 * Food-commodity grouping for the OpenCORE MCP server. Ported from
 * src/data/foods.ts (plain ESM, no TS types, no symptoms.ts catalog).
 *
 * The feeds have no structured food field — the only food signal is the
 * free-text `vehicle` on an outbreak and the product description on a recall.
 * This taxonomy buckets those strings into broad commodities so an MCP client
 * can present a food-first view. A category only ever appears because a real
 * FDA/CDC/FSIS record maps into it: this is a display grouping, NEVER a risk
 * judgment and NEVER a supply-chain inference. Named suppliers still come solely
 * from the official curated record.
 */
import { detectPathogen } from "./data.mjs";

/** The FDA table writes this literal when no food has been identified yet. */
export const NOT_YET_IDENTIFIED = "Not yet identified";

/**
 * Ordered by priority — the FIRST category whose term appears in the text wins,
 * so put specific commodities (beef, poultry) before generic ones (produce).
 */
export const FOOD_CATEGORIES = [
  { id: "infant-formula", label: "Infant formula", emoji: "🍼", matchTerms: ["infant formula", "baby formula", "formula"] },
  { id: "eggs", label: "Eggs", emoji: "🥚", matchTerms: ["egg"] },
  { id: "beef", label: "Beef", emoji: "🥩", matchTerms: ["beef", "veal", "steak"] },
  { id: "poultry", label: "Poultry", emoji: "🍗", matchTerms: ["chicken", "poultry", "turkey", "duck"] },
  { id: "pork", label: "Pork", emoji: "🥓", matchTerms: ["pork", "bacon", "ham", "sausage"] },
  { id: "seafood", label: "Seafood", emoji: "🐟", matchTerms: ["fish", "salmon", "tuna", "shrimp", "oyster", "clam", "mussel", "scallop", "crab", "lobster", "seafood", "shellfish"] },
  { id: "dairy", label: "Dairy & cheese", emoji: "🧀", matchTerms: ["cheese", "ricotta", "queso", "requeson", "milk", "yogurt", "butter", "cream", "dairy"] },
  { id: "leafy-greens", label: "Leafy greens", emoji: "🥬", matchTerms: ["lettuce", "romaine", "iceberg", "spinach", "leafy green", "arugula", "kale", "spring mix", "salad"] },
  { id: "berries", label: "Berries", emoji: "🫐", matchTerms: ["blueberr", "strawberr", "raspberr", "blackberr", "berries", "berry"] },
  { id: "melons", label: "Melons", emoji: "🍈", matchTerms: ["cantaloupe", "honeydew", "watermelon", "melon"] },
  { id: "sprouts", label: "Sprouts", emoji: "🌱", matchTerms: ["sprout"] },
  { id: "herbs-supplements", label: "Herbs & supplements", emoji: "🌿", matchTerms: ["moringa", "basil", "cilantro", "parsley", "herb", "spice", "supplement", "powder"] },
  { id: "nuts-seeds", label: "Nuts & seeds", emoji: "🥜", matchTerms: ["peanut", "almond", "cashew", "walnut", "pistachio", "tahini", "sesame", "nut butter", "seed", "nut"] },
  { id: "flour-grain", label: "Flour & grain", emoji: "🌾", matchTerms: ["flour", "cereal", "grain", "rice", "wheat", "oat", "pasta", "bread", "cornmeal"] },
  { id: "other-produce", label: "Other produce", emoji: "🥕", matchTerms: ["onion", "tomato", "cucumber", "pepper", "carrot", "potato", "mushroom", "avocado", "mango", "papaya", "apple", "peach", "produce", "vegetable", "fruit"] },
];

/** Fallback bucket for named foods that match no category. Never a match target. */
export const OTHER_FOOD = { id: "other", label: "Other foods", emoji: "🍽️", matchTerms: [] };

/** First category whose term appears in `text`, or null if none match. */
export function categorizeFood(text) {
  if (!text) return null;
  const hay = String(text).toLowerCase();
  return FOOD_CATEGORIES.find((c) => c.matchTerms.some((t) => hay.includes(t))) ?? null;
}

/** Look up a category by its route id (includes the OTHER fallback). */
export function foodById(id) {
  if (id === OTHER_FOOD.id) return OTHER_FOOD;
  return FOOD_CATEGORIES.find((c) => c.id === id);
}

/** Product text of a recall — openFDA rows use `product`, FSIS rows use `productDescription`. */
function productOf(r) {
  return r.productDescription ?? r.product ?? "";
}

/**
 * Pathogen ids implicated in a set of outbreaks + recalls, deduped. The MCP has
 * no PATHOGENS catalog, so detection is substring-based: outbreaks via their
 * free-text `pathogen` column, recalls via a precomputed `pathogen` id (falling
 * back to detecting from reason + product).
 */
function pathogensFor(outbreaks, recalls) {
  const ids = new Set();
  for (const o of outbreaks) {
    const id = detectPathogen(o.pathogen);
    if (id) ids.add(id);
  }
  for (const r of recalls) {
    const id = r.pathogen ?? detectPathogen(`${r.reason ?? ""} ${productOf(r)}`);
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * Named suppliers/brands across a set of outbreaks, deduped by name. In the MCP
 * these ride on each outbreak as a `named` array attached from CURATED by the
 * caller — never inferred here.
 */
function entitiesFor(outbreaks) {
  const seen = new Map();
  for (const o of outbreaks) {
    for (const e of o.named ?? []) if (!seen.has(e.name)) seen.set(e.name, e);
  }
  return [...seen.values()];
}

/** Assemble one food entry from records already known to belong to `category`. */
export function assembleFoodEntry(category, outbreaks, fdaRecalls, fsisRecalls) {
  return {
    category,
    outbreaks,
    fdaRecalls,
    fsisRecalls,
    pathogens: pathogensFor(outbreaks, [...fdaRecalls, ...fsisRecalls]),
    namedEntities: entitiesFor(outbreaks),
    recallCount: fdaRecalls.length + fsisRecalls.length,
  };
}

/** The category a record belongs to, falling back to OTHER for named-but-unmatched. */
function bucketOf(text) {
  return categorizeFood(text) ?? OTHER_FOOD;
}

/**
 * Group active outbreaks + FDA recalls + FSIS recalls into food entries. Only
 * outbreaks with an identified vehicle are placed; recalls are placed by product
 * description. Sorted: foods with an active outbreak first, then by recall
 * volume, then alphabetically. Foods with no records never appear.
 */
export function buildFoodIndex(outbreaks, fdaRecalls, fsisRecalls) {
  const groups = new Map();
  const bucket = (cat) => {
    let g = groups.get(cat.id);
    if (!g) groups.set(cat.id, (g = { category: cat, ob: [], fda: [], fsis: [] }));
    return g;
  };

  for (const o of outbreaks) {
    if (!o.vehicle || o.vehicle === NOT_YET_IDENTIFIED) continue;
    bucket(bucketOf(o.vehicle)).ob.push(o);
  }
  for (const r of fdaRecalls) bucket(bucketOf(productOf(r))).fda.push(r);
  for (const r of fsisRecalls) bucket(bucketOf(productOf(r))).fsis.push(r);

  return [...groups.values()]
    .map((g) => assembleFoodEntry(g.category, g.ob, g.fda, g.fsis))
    .sort((a, b) => {
      if ((b.outbreaks.length > 0 ? 1 : 0) !== (a.outbreaks.length > 0 ? 1 : 0))
        return (b.outbreaks.length > 0 ? 1 : 0) - (a.outbreaks.length > 0 ? 1 : 0);
      if (b.outbreaks.length !== a.outbreaks.length) return b.outbreaks.length - a.outbreaks.length;
      if (b.recallCount !== a.recallCount) return b.recallCount - a.recallCount;
      return a.category.label.localeCompare(b.category.label);
    });
}
