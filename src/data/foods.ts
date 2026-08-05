import type { Outbreak, Recall, NamedEntity } from "./types";
import { PATHOGENS, matchesOutbreakPathogen, type Pathogen } from "./symptoms";

/**
 * A derived food-commodity category. The app has no food field — the only food
 * signal is the free-text `vehicle` on an outbreak and the `productDescription`
 * on a recall. This taxonomy buckets those strings into broad commodities so the
 * app can present a food-first view. A category only ever appears because a real
 * FDA/CDC/FSIS record maps into it — this is a display grouping, never a risk
 * judgment, and never a supply-chain inference.
 */
export interface FoodCategory {
  id: string;
  label: string;
  emoji: string;
  /** Lowercase substrings that map a vehicle/product string into this category. */
  matchTerms: string[];
}

/** The FDA table writes this literal when no food has been identified yet. */
export const NOT_YET_IDENTIFIED = "Not yet identified";

/**
 * Ordered by priority — the FIRST category whose term appears in the text wins,
 * so put specific commodities (beef, poultry) before generic ones (produce).
 */
export const FOOD_CATEGORIES: FoodCategory[] = [
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
export const OTHER_FOOD: FoodCategory = { id: "other", label: "Other foods", emoji: "🍽️", matchTerms: [] };

/** First category whose term appears in `text`, or null if none match. */
export function categorizeFood(text: string | null | undefined): FoodCategory | null {
  if (!text) return null;
  const hay = text.toLowerCase();
  return FOOD_CATEGORIES.find((c) => c.matchTerms.some((t) => hay.includes(t))) ?? null;
}

/** Look up a category by its route id (includes the OTHER fallback). */
export function foodById(id: string): FoodCategory | undefined {
  if (id === OTHER_FOOD.id) return OTHER_FOOD;
  return FOOD_CATEGORIES.find((c) => c.id === id);
}

/** Everything the app knows about one food, gathered across the three feeds. */
export interface FoodEntry {
  category: FoodCategory;
  outbreaks: Outbreak[];
  fdaRecalls: Recall[];
  fsisRecalls: Recall[];
  pathogens: Pathogen[];
  namedEntities: NamedEntity[];
  recallCount: number;
}

/** Pathogens implicated in a set of outbreaks + recalls, deduped, no repeats. */
function pathogensFor(outbreaks: Outbreak[], recalls: Recall[]): Pathogen[] {
  const ids = new Set<string>();
  for (const p of PATHOGENS) {
    if (outbreaks.some((o) => matchesOutbreakPathogen(p, o.pathogen))) ids.add(p.id);
  }
  for (const r of recalls) {
    if (r.pathogen) ids.add(r.pathogen);
  }
  return PATHOGENS.filter((p) => ids.has(p.id));
}

/** Named suppliers/brands across a set of outbreaks, deduped by entity id. */
function entitiesFor(outbreaks: Outbreak[]): NamedEntity[] {
  const seen = new Map<string, NamedEntity>();
  for (const o of outbreaks) {
    for (const e of o.namedEntities ?? []) if (!seen.has(e.id)) seen.set(e.id, e);
  }
  return [...seen.values()];
}

/** Assemble one FoodEntry from records already known to belong to `category`. */
export function assembleFoodEntry(
  category: FoodCategory,
  outbreaks: Outbreak[],
  fdaRecalls: Recall[],
  fsisRecalls: Recall[]
): FoodEntry {
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
function bucketOf(text: string | null | undefined): FoodCategory {
  return categorizeFood(text) ?? OTHER_FOOD;
}

/**
 * Group active outbreaks + FDA recalls + FSIS recalls into food entries. Only
 * active outbreaks with an identified vehicle are placed; recalls are placed by
 * product description. Sorted: foods with an active outbreak first, then by
 * recall volume, then alphabetically. Foods with no records never appear.
 */
export function buildFoodIndex(
  outbreaks: Outbreak[],
  fdaRecalls: Recall[],
  fsisRecalls: Recall[]
): FoodEntry[] {
  const groups = new Map<string, { category: FoodCategory; ob: Outbreak[]; fda: Recall[]; fsis: Recall[] }>();
  const bucket = (cat: FoodCategory) => {
    let g = groups.get(cat.id);
    if (!g) groups.set(cat.id, (g = { category: cat, ob: [], fda: [], fsis: [] }));
    return g;
  };

  for (const o of outbreaks) {
    if (o.status !== "active" || o.vehicle === NOT_YET_IDENTIFIED) continue;
    bucket(bucketOf(o.vehicle)).ob.push(o);
  }
  for (const r of fdaRecalls) bucket(bucketOf(r.productDescription)).fda.push(r);
  for (const r of fsisRecalls) bucket(bucketOf(r.productDescription)).fsis.push(r);

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
