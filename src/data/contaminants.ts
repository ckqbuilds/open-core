import type { Recall, SourceCitation } from "./types";
import { PATHOGENS, matchesOutbreakPathogen, type Pathogen } from "./symptoms";

/**
 * Food-safety HAZARD TAXONOMY + a heuristic classifier for recall text.
 *
 * Food-safety practice groups contamination into four hazard types —
 * biological, chemical, physical, allergenic — with subcategories for the first
 * two. This file (1) holds the plain-English teaching content shown on Learn and
 * (2) classifies a recall into one of those types PLUS an honest "other"
 * (quality / labeling) bucket for recalls that are not a contaminant at all.
 *
 * INTEGRITY: `classifyRecall` is a KEYWORD HEURISTIC over the recall's own
 * `reason` text — it is NOT an official FDA field, and the UI must label it as
 * such. It never asserts a product is "safe"; the worst it says is "we couldn't
 * categorize the hazard from the reason text" (the "other" bucket).
 */

export type ContaminantType =
  | "biological"
  | "chemical"
  | "physical"
  | "allergenic"
  | "other";

export interface ContaminantSubcategory {
  name: string;
  examples: string;
}

export interface ContaminantInfo {
  id: ContaminantType;
  label: string;
  emoji: string;
  /** Semantic tone key — styling lives in ContaminantBadge / ContaminationSection. */
  tone: ContaminantType;
  blurb: string;
  subcategories: ContaminantSubcategory[];
  source?: SourceCitation;
}

/* ------------------------------------------------------------------ */
/* Sources — food-safety guidance the teaching content is drawn from   */
/* ------------------------------------------------------------------ */

const fdaPathogens: SourceCitation = {
  agency: "FDA",
  label: "FDA: Foodborne Pathogens",
  url: "https://www.fda.gov/food/outbreaks-foodborne-illness/foodborne-pathogens",
  date: "2025-11-12",
};

const fdaChemical: SourceCitation = {
  agency: "FDA",
  label: "FDA: Chemical Contaminants in Food",
  url: "https://www.fda.gov/food/environmental-contaminants-food/chemical-contaminants",
  date: "2025-10-08",
};

const fdaPhysical: SourceCitation = {
  agency: "FDA",
  label: "FDA: Investigations Operations Manual — Physical Hazards",
  url: "https://www.fda.gov/food/hazard-analysis-critical-control-point-haccp/haccp-principles-application-guidelines",
  date: "2024-09-19",
};

const fdaAllergens: SourceCitation = {
  agency: "FDA",
  label: "FDA: Food Allergies (the major food allergens)",
  url: "https://www.fda.gov/food/food-labeling-nutrition/food-allergies",
  date: "2026-01-05",
};

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

export const CONTAMINANTS: ContaminantInfo[] = [
  {
    id: "biological",
    label: "Biological",
    emoji: "🦠",
    tone: "biological",
    blurb:
      "Living organisms — or the toxins they make — that cause infection or illness when swallowed. The most common cause of foodborne outbreaks. This is the category every outbreak on this site falls into.",
    subcategories: [
      {
        name: "Bacteria",
        examples: "Salmonella, Listeria, E. coli, Campylobacter",
      },
      { name: "Viruses", examples: "Norovirus, Hepatitis A" },
      { name: "Parasites", examples: "Cyclospora, Giardia" },
      { name: "Fungi / molds", examples: "Spoilage molds and their mycotoxins" },
    ],
    source: fdaPathogens,
  },
  {
    id: "chemical",
    label: "Chemical",
    emoji: "⚗️",
    tone: "chemical",
    blurb:
      "Harmful substances that get into food by nature, by process, or from the environment. Unlike germs, cooking does not remove them.",
    subcategories: [
      {
        name: "Naturally occurring",
        examples: "Plant and mold toxins, such as mycotoxins in grains or nuts",
      },
      {
        name: "Added",
        examples: "Unapproved additives, excess preservatives (e.g. nitrites, sulfites)",
      },
      {
        name: "Environmental / process",
        examples: "Pesticides, heavy metals (lead, arsenic), cleaning agents, packaging migration",
      },
    ],
    source: fdaChemical,
  },
  {
    id: "physical",
    label: "Physical",
    emoji: "🔩",
    tone: "physical",
    blurb:
      "Hard or sharp foreign objects that end up in food and can cut, choke, or break a tooth. Usually a manufacturing or handling failure rather than a germ.",
    subcategories: [],
    source: fdaPhysical,
  },
  {
    id: "allergenic",
    label: "Allergenic",
    emoji: "🥜",
    tone: "allergenic",
    blurb:
      "A major food allergen that is present but not declared on the label. Harmless to most people, but it can cause a severe or life-threatening reaction in someone allergic — which is why undeclared allergens are one of the most common reasons for a recall.",
    subcategories: [
      {
        name: "The major allergens (Big 9)",
        examples: "Milk, egg, peanut, tree nuts, soy, wheat, fish, shellfish, sesame",
      },
    ],
    source: fdaAllergens,
  },
  {
    id: "other",
    label: "Quality / labeling",
    emoji: "🏷️",
    tone: "other",
    blurb:
      "Not one of the four hazard types. These recalls cover quality, potency, and non-allergen labeling problems — subpotent or superpotent supplements, misbranding, or missing required label information. Grouped honestly rather than forced into a hazard bucket.",
    subcategories: [],
  },
];

/** Look up a taxonomy entry by type. */
export function contaminantById(type: ContaminantType): ContaminantInfo {
  return CONTAMINANTS.find((c) => c.id === type) ?? CONTAMINANTS[CONTAMINANTS.length - 1];
}

/* ------------------------------------------------------------------ */
/* Classifier                                                          */
/* ------------------------------------------------------------------ */

export interface ContaminantClassification {
  type: ContaminantType;
  subtype?: string;
  /** Human-readable, e.g. "Biological · bacteria" or "Quality / labeling". */
  label: string;
}

const ALLERGEN_TERMS: [RegExp, string][] = [
  [/tree nut|almond|walnut|cashew|pecan|hazelnut|pistachio|macadamia|brazil nut/, "tree nuts"],
  [/peanut/, "peanut"],
  [/\bmilk\b|dairy|casein|whey/, "milk"],
  [/\beggs?\b/, "egg"],
  [/\bsoy\b|soya|soybean/, "soy"],
  [/wheat|gluten/, "wheat"],
  [/shellfish|shrimp|crab|lobster|prawn/, "shellfish"],
  [/\bfish\b|anchovy|tuna|salmon|cod\b/, "fish"],
  [/sesame|tahini/, "sesame"],
  [/sulfite/, "sulfites"],
];

const ALLERGENIC_RE =
  /undeclared|allergen|not declared|contains (milk|egg|peanut|tree nut|soy|wheat|fish|shellfish|sesame)|misbrand.*(allergen|milk|egg|peanut|soy|wheat|nut|sesame)/;

const PHYSICAL_RE =
  /foreign (material|object)|\bmetal\b|\bglass\b|\bplastic\b|\bwood\b|\bbone\b|\brock\b|\bstone\b|\brubber\b|hard piece/;

// `lead` excludes the verb "lead to"/"leading" so botulism recalls ("may lead
// to Clostridium botulinum") route to biological, not chemical.
const CHEMICAL_RE =
  /\blead\b(?! to\b| to |ing\b)|arsenic|mercury|cadmium|pesticide|cleaning|sanitizer|chemical|melamine|benzene|residue|pfas|unapproved (food )?additive|unapproved ingredient|nitrite|sulfite/;

const CHEMICAL_ENVIRONMENTAL_RE =
  /\blead\b(?! to\b| to |ing\b)|arsenic|mercury|cadmium|pesticide|cleaning|sanitizer|pfas|residue|packaging|migration/;
const CHEMICAL_NATURAL_RE = /mycotoxin|aflatoxin|histamine|scombro|natural toxin|plant toxin/;

const BIOLOGICAL_RE =
  /listeria|salmonella|\bcoli\b|coliform|botul|clostridi|staph|bacillus|norovirus|hepatitis|cyclospora|microbial|pathogen|not adequately pasteuriz|undercook|\bmold\b|\byeast\b|aflatoxin/;

const BIO_BACTERIA_RE = /listeria|salmonella|\bcoli\b|coliform|botul|clostridi|staph|bacillus/;
const BIO_VIRUS_RE = /norovirus|hepatitis/;
const BIO_PARASITE_RE = /cyclospora|giardia|parasite/;
const BIO_FUNGI_RE = /\bmold\b|\byeast\b|aflatoxin/;

function titleType(type: ContaminantType): string {
  return contaminantById(type).label;
}

/**
 * Heuristically categorize a recall from its reason text (+ product
 * description). Evaluated in order allergenic → physical → chemical →
 * biological → other. NOT an official FDA field.
 */
export function classifyRecall(recall: Recall): ContaminantClassification {
  const reason = recall.reason.toLowerCase();
  const text = `${reason} ${(recall.productDescription ?? "").toLowerCase()}`;

  // 1. Allergenic — undeclared major allergens.
  if (ALLERGENIC_RE.test(text)) {
    const named = ALLERGEN_TERMS.find(([re]) => re.test(text));
    const subtype = named?.[1];
    return {
      type: "allergenic",
      subtype,
      label: subtype ? `Allergenic · ${subtype}` : "Allergenic",
    };
  }

  // 2. Physical — foreign objects. Matched against the REASON only: packaging
  // words ("plastic jar", "glass bottle") in the product description are not a
  // hazard, and would otherwise mislabel real pathogen recalls as physical.
  if (PHYSICAL_RE.test(reason)) {
    return { type: "physical", label: "Physical" };
  }

  // 3. Chemical — heavy metals, pesticides, additives, etc.
  if (CHEMICAL_RE.test(text)) {
    const subtype = CHEMICAL_NATURAL_RE.test(text)
      ? "naturally occurring"
      : CHEMICAL_ENVIRONMENTAL_RE.test(text)
        ? "environmental"
        : "added";
    return { type: "chemical", subtype, label: `Chemical · ${subtype}` };
  }

  // 4. Biological — a named pathogen or a microbial keyword.
  const matched = PATHOGENS.find((p) => matchesOutbreakPathogen(p, text));
  if (matched) {
    const subtype = matched.category.toLowerCase();
    return { type: "biological", subtype, label: `Biological · ${subtype}` };
  }
  if (BIOLOGICAL_RE.test(text)) {
    const subtype = BIO_BACTERIA_RE.test(text)
      ? "bacteria"
      : BIO_VIRUS_RE.test(text)
        ? "virus"
        : BIO_PARASITE_RE.test(text)
          ? "parasite"
          : BIO_FUNGI_RE.test(text)
            ? "fungi"
            : undefined;
    return {
      type: "biological",
      subtype,
      label: subtype ? `Biological · ${subtype}` : "Biological",
    };
  }

  // 5. Other — quality / labeling / potency. Honest residual, not a hazard.
  return { type: "other", label: titleType("other") };
}

/**
 * Every tracked outbreak is a biological hazard. Subtype comes from the matched
 * pathogen's category, when one is known.
 */
export function classifyOutbreak(
  pathogen: Pathogen | null
): { type: "biological"; subtype?: string } {
  return { type: "biological", subtype: pathogen?.category.toLowerCase() };
}
