import type { SourceCitation } from "./types";

/**
 * HAND-VERIFIED symptom & care reference for foodborne pathogens.
 *
 * Same integrity rules as src/data/outbreaks.ts, applied to health content:
 *  1. Every sign, onset window, duration and care statement is transcribed from
 *     the cited CDC page — nothing is modeled, averaged or inferred.
 *  2. Risk-group notes reproduce CDC's OWN published guidance for that group.
 *     We do not extrapolate one group's guidance to another.
 *  3. This file describes illnesses. It never diagnoses a user and never
 *     recommends a drug or dose — where CDC states a treatment fact (e.g.
 *     "antibiotics are not recommended for STEC"), we quote that fact and send
 *     the reader to a provider.
 *
 * When adding a pathogen, add its CDC citation first, then fill the card from
 * that page only.
 */

const cdc = (slug: string, label: string, date: string): SourceCitation => ({
  agency: "CDC",
  label,
  url: `https://www.cdc.gov/${slug}/about/index.html`,
  date,
});

const cdcSalmonella = cdc("salmonella", "CDC: About Salmonella Infection", "2026-04-15");
const cdcCyclospora = cdc("cyclosporiasis", "CDC: About Cyclosporiasis", "2026-05-02");
const cdcListeria = cdc("listeria", "CDC: About Listeria Infection", "2026-03-28");
const cdcEcoli = cdc("ecoli", "CDC: About E. coli Infection", "2026-04-02");
const cdcNorovirus = cdc("norovirus", "CDC: About Norovirus", "2026-02-19");
const cdcCampylobacter = cdc("campylobacter", "CDC: About Campylobacter Infection", "2026-03-11");
const cdcHepA = cdc("hepatitis-a", "CDC: About Hepatitis A", "2026-01-30");
const cdcVibrio = cdc("vibrio", "CDC: About Vibrio Infection", "2026-06-04");
const cdcShigella = cdc("shigella", "CDC: About Shigella Infection", "2026-05-20");

const cdcFoodPoisoningSymptoms: SourceCitation = {
  agency: "CDC",
  label: "CDC: Food Poisoning Symptoms",
  url: "https://www.cdc.gov/food-safety/signs-symptoms/index.html",
  date: "2026-04-22",
};

const cdcListeriaPregnancy: SourceCitation = {
  agency: "CDC",
  label: "CDC: Listeria Infection and Pregnancy",
  url: "https://www.cdc.gov/listeria/risk-factors/index.html",
  date: "2026-03-28",
};

const cdcHepAVaccine: SourceCitation = {
  agency: "CDC",
  label: "CDC: Hepatitis A Vaccine Administration and Post-Exposure Prophylaxis",
  url: "https://www.cdc.gov/hepatitis-a/hcp/vaccine-administration/index.html",
  date: "2026-01-30",
};

const cdcVibrioRisk: SourceCitation = {
  agency: "CDC",
  label: "CDC: People at Increased Risk for Vibrio Infection",
  url: "https://www.cdc.gov/vibrio/risk-factors/index.html",
  date: "2026-06-04",
};

/* ------------------------------------------------------------------ */
/* Risk groups                                                         */
/* ------------------------------------------------------------------ */

export type RiskGroupId =
  | "pregnant"
  | "age65"
  | "under5"
  | "immunocompromised"
  | "liverDisease";

export interface RiskGroup {
  id: RiskGroupId;
  label: string;
  /** Compact label for the chip row. */
  short: string;
}

/**
 * The conditions a user can select. Each exists because CDC publishes
 * group-specific guidance for it — not because we inferred a difference.
 */
export const RISK_GROUPS: RiskGroup[] = [
  { id: "pregnant", label: "Pregnant", short: "Pregnant" },
  { id: "age65", label: "Age 65 or older", short: "65+" },
  { id: "under5", label: "Child under 5", short: "Under 5" },
  {
    id: "immunocompromised",
    label: "Weakened immune system",
    short: "Immunocompromised",
  },
  { id: "liverDisease", label: "Chronic liver disease", short: "Liver disease" },
];

export interface RiskNote {
  group: RiskGroupId;
  /** "urgent" renders as a call-out; "elevated" as a plain highlighted note. */
  severity: "urgent" | "elevated";
  text: string;
  source: SourceCitation;
}

/* ------------------------------------------------------------------ */
/* Pathogens                                                           */
/* ------------------------------------------------------------------ */

export interface Pathogen {
  id: string;
  name: string;
  /** Name of the illness, when it differs from the organism. */
  aka?: string;
  category: "Bacteria" | "Parasite" | "Virus";
  summary: string;
  /** Terms matched against a live outbreak's `pathogen` field for cross-linking. */
  matchTerms: string[];
  signs: string[];
  onset: string;
  duration: string;
  spread: string;
  /** What CDC says about care. Never a dose, never a prescription. */
  care: string[];
  /** Things CDC explicitly advises against — rendered in a warning block. */
  doNot?: string[];
  riskNotes: RiskNote[];
  source: SourceCitation;
}

export const PATHOGENS: Pathogen[] = [
  {
    id: "salmonella",
    name: "Salmonella",
    aka: "Salmonellosis",
    category: "Bacteria",
    summary:
      "One of the most common causes of foodborne illness in the US. Linked to eggs, poultry, raw produce, and low-moisture foods.",
    matchTerms: ["salmonella"],
    signs: [
      "Diarrhea, which may be bloody",
      "Fever",
      "Stomach cramps",
      "Nausea and vomiting",
    ],
    onset: "6 hours to 6 days after exposure",
    duration: "4 to 7 days",
    spread:
      "Eating contaminated food, or contact with infected animals (especially poultry and reptiles) and their environments.",
    care: [
      "Most people recover without specific treatment. Drink extra fluids to replace what diarrhea takes out.",
      "CDC advises antibiotics only for people who are severely ill or at higher risk of severe illness — that decision belongs to a healthcare provider.",
    ],
    riskNotes: [
      {
        group: "under5",
        severity: "elevated",
        text: "Children under 5 have the highest rate of Salmonella infection and are more likely to develop severe illness.",
        source: cdcSalmonella,
      },
      {
        group: "age65",
        severity: "elevated",
        text: "Adults 65 and older are more likely to have severe illness and to be hospitalized.",
        source: cdcSalmonella,
      },
      {
        group: "immunocompromised",
        severity: "elevated",
        text: "A weakened immune system raises the chance the infection spreads from the intestines into the bloodstream. Contact a provider early rather than waiting it out.",
        source: cdcSalmonella,
      },
    ],
    source: cdcSalmonella,
  },
  {
    id: "cyclospora",
    name: "Cyclospora",
    aka: "Cyclosporiasis",
    category: "Parasite",
    summary:
      "A parasite spread by contaminated fresh produce. Unlike most foodborne illness, it typically does not clear up on its own.",
    matchTerms: ["cyclospora"],
    signs: [
      "Watery diarrhea, often frequent and explosive",
      "Loss of appetite and weight loss",
      "Stomach cramps, bloating, increased gas",
      "Nausea and fatigue",
      "Low-grade fever in some people",
    ],
    onset: "About 1 week after exposure (range: 2 days to more than 2 weeks)",
    duration:
      "Can last weeks to a month or more, and symptoms may go away and come back",
    spread:
      "Eating fresh produce or drinking water contaminated with feces containing the parasite. It is NOT spread person to person.",
    care: [
      "CDC states cyclosporiasis is treated with prescription antibiotics. It often does not resolve without treatment, so see a healthcare provider rather than waiting.",
      "Diagnosis requires a specific stool test — routine stool tests do not detect Cyclospora, so tell your provider about produce exposure.",
      "Rest and fluids while you recover.",
    ],
    riskNotes: [
      {
        group: "immunocompromised",
        severity: "elevated",
        text: "People with weakened immune systems may have longer illness and are more likely to relapse after treatment.",
        source: cdcCyclospora,
      },
    ],
    source: cdcCyclospora,
  },
  {
    id: "listeria",
    name: "Listeria",
    aka: "Listeriosis",
    category: "Bacteria",
    summary:
      "Uncommon but severe. Linked to deli meats, soft cheeses, and refrigerated ready-to-eat foods — it grows even at refrigerator temperatures.",
    matchTerms: ["listeria"],
    signs: [
      "Intestinal illness: diarrhea and vomiting, usually starting within 24 hours and lasting 1–3 days",
      "Invasive illness: fever, muscle aches, headache, stiff neck",
      "Confusion, loss of balance, or seizures when the infection reaches the nervous system",
    ],
    onset:
      "Invasive illness usually begins 1 to 4 weeks after exposure, but can start as late as 70 days",
    duration: "Days to weeks; invasive listeriosis requires hospital treatment",
    spread:
      "Eating contaminated ready-to-eat foods. Listeria survives and multiplies at refrigeration temperatures.",
    care: [
      "Invasive listeriosis is treated with antibiotics in a hospital setting. If you have fever and muscle aches after eating a recalled food, contact a provider.",
      "Tell your provider what you ate and when — the long incubation window means the food may be weeks behind you.",
    ],
    riskNotes: [
      {
        group: "pregnant",
        severity: "urgent",
        text: "CDC: pregnant people are about 10 times more likely to get listeriosis. Illness during pregnancy is usually mild for the pregnant person — fever, fatigue, muscle aches — but can cause miscarriage, stillbirth, premature delivery, or life-threatening infection of the newborn. Contact your provider even if symptoms feel mild.",
        source: cdcListeriaPregnancy,
      },
      {
        group: "age65",
        severity: "urgent",
        text: "CDC: adults 65 and older are at higher risk of invasive listeriosis, which can spread to the bloodstream and nervous system. Seek care for fever and muscle aches after a Listeria recall.",
        source: cdcListeriaPregnancy,
      },
      {
        group: "immunocompromised",
        severity: "urgent",
        text: "CDC: people with weakened immune systems are at higher risk of invasive listeriosis. Do not wait to see if a fever passes — contact a provider.",
        source: cdcListeriaPregnancy,
      },
    ],
    source: cdcListeria,
  },
  {
    id: "ecoli",
    name: "E. coli O157:H7",
    aka: "STEC — Shiga toxin-producing E. coli",
    category: "Bacteria",
    summary:
      "Linked to leafy greens, ground beef, raw flour and unpasteurized dairy. A small share of cases develop a serious kidney complication.",
    matchTerms: ["e. coli", "e.coli", "escherichia", "stec"],
    signs: [
      "Severe stomach cramps",
      "Diarrhea, often bloody",
      "Vomiting",
      "Low-grade fever, usually under 101°F (38.3°C)",
    ],
    onset: "3 to 4 days after exposure (range: 1 to 10 days)",
    duration: "5 to 7 days for most people",
    spread:
      "Eating contaminated food, drinking untreated water, contact with animals or their environments, and person-to-person contact.",
    care: [
      "Most people recover with rest and fluids.",
      "Watch for signs of hemolytic uremic syndrome (HUS), a kidney complication that usually starts about a week in, as diarrhea is improving: decreased urination, unusual tiredness, and loss of pink color in the cheeks and lower eyelids. HUS is a medical emergency — go to a provider immediately.",
    ],
    doNot: [
      "CDC advises against antibiotics for STEC infection — they may increase the risk of HUS.",
      "CDC advises against anti-diarrheal medicine such as loperamide (Imodium), which may also increase HUS risk.",
    ],
    riskNotes: [
      {
        group: "under5",
        severity: "urgent",
        text: "CDC: children under 5 are among those most likely to develop HUS. Contact a provider for bloody diarrhea rather than treating it at home.",
        source: cdcEcoli,
      },
      {
        group: "age65",
        severity: "urgent",
        text: "CDC: adults 65 and older are among those most likely to develop HUS. Contact a provider for bloody diarrhea.",
        source: cdcEcoli,
      },
      {
        group: "immunocompromised",
        severity: "elevated",
        text: "People with weakened immune systems are more likely to develop severe illness, including HUS.",
        source: cdcEcoli,
      },
    ],
    source: cdcEcoli,
  },
  {
    id: "norovirus",
    name: "Norovirus",
    category: "Virus",
    summary:
      "The most common cause of foodborne illness in the US, and extremely contagious. Often spread by an infected food handler.",
    matchTerms: ["norovirus"],
    signs: [
      "Diarrhea and vomiting",
      "Nausea",
      "Stomach pain",
      "Sometimes fever, headache, and body aches",
    ],
    onset: "12 to 48 hours after exposure",
    duration: "1 to 3 days",
    spread:
      "Person to person, contaminated food or water, and touching contaminated surfaces. It takes very few virus particles to infect someone.",
    care: [
      "There is no specific medicine for norovirus. Drink plenty of liquids to replace fluid lost to vomiting and diarrhea — dehydration is the main danger.",
      "Wash hands with soap and water. CDC notes hand sanitizer does not work well against norovirus.",
      "Do not prepare food for others while sick and for 2 days after symptoms stop.",
    ],
    riskNotes: [
      {
        group: "under5",
        severity: "elevated",
        text: "Young children are more likely to become dehydrated. Watch for crying with few or no tears and unusual sleepiness or fussiness.",
        source: cdcNorovirus,
      },
      {
        group: "age65",
        severity: "elevated",
        text: "Older adults are more likely to become severely dehydrated and to need medical care.",
        source: cdcNorovirus,
      },
    ],
    source: cdcNorovirus,
  },
  {
    id: "campylobacter",
    name: "Campylobacter",
    aka: "Campylobacteriosis",
    category: "Bacteria",
    summary:
      "Most often linked to raw or undercooked poultry, unpasteurized milk, and untreated water.",
    matchTerms: ["campylobacter"],
    signs: [
      "Diarrhea, often bloody",
      "Fever",
      "Stomach cramps",
      "Nausea and vomiting",
    ],
    onset: "2 to 5 days after exposure",
    duration: "About 1 week",
    spread:
      "Eating raw or undercooked poultry, cross-contamination in the kitchen, unpasteurized milk, untreated water, and contact with animal feces.",
    care: [
      "Most people recover with rest and extra fluids.",
      "A small number of people develop complications afterward — reactive arthritis, or Guillain-Barré syndrome, a rare condition causing muscle weakness and paralysis that can begin weeks after the diarrhea. Report new weakness or tingling to a provider.",
    ],
    riskNotes: [
      {
        group: "immunocompromised",
        severity: "elevated",
        text: "People with weakened immune systems may have infection that spreads to the bloodstream and becomes life-threatening. Contact a provider early.",
        source: cdcCampylobacter,
      },
      {
        group: "under5",
        severity: "elevated",
        text: "Children under 5 have a higher rate of Campylobacter infection than other age groups.",
        source: cdcCampylobacter,
      },
    ],
    source: cdcCampylobacter,
  },
  {
    id: "hepatitis-a",
    name: "Hepatitis A",
    category: "Virus",
    summary:
      "A vaccine-preventable liver infection. If you learn about an exposure early, a shot can stop the illness before it starts.",
    matchTerms: ["hepatitis a", "hepatitis-a", "hav"],
    signs: [
      "Yellow skin or eyes (jaundice), dark urine, light-colored stool",
      "Fatigue",
      "Nausea, vomiting, loss of appetite",
      "Stomach pain, especially on the upper right side",
      "Fever and joint pain",
    ],
    onset: "15 to 50 days after exposure (average 28 days)",
    duration: "Usually under 2 months, though some people are ill for up to 6 months",
    spread:
      "Eating food or drinking water contaminated with feces containing the virus, often via an infected food handler, and through close personal contact.",
    care: [
      "TIME-SENSITIVE: CDC recommends hepatitis A vaccine or immune globulin within 2 weeks of exposure to prevent illness. If a recall or advisory names hepatitis A and you ate the food, contact a provider or health department now — do not wait for symptoms.",
      "There is no specific treatment once illness begins. Care is rest, nutrition, and fluids, and most people recover fully.",
      "Ask a provider before taking any medication, including over-the-counter drugs — some are hard on the liver.",
    ],
    riskNotes: [
      {
        group: "liverDisease",
        severity: "urgent",
        text: "CDC: people with chronic liver disease are at increased risk of severe illness — including liver failure — from hepatitis A, and are recommended for vaccination.",
        source: cdcHepAVaccine,
      },
      {
        group: "age65",
        severity: "elevated",
        text: "Adults over 50 have a higher rate of severe illness and death from hepatitis A.",
        source: cdcHepA,
      },
      {
        group: "immunocompromised",
        severity: "elevated",
        text: "Immunocompromised people are recommended for hepatitis A vaccination and should discuss post-exposure options with a provider.",
        source: cdcHepAVaccine,
      },
    ],
    source: cdcHepA,
  },
  {
    id: "vibrio",
    name: "Vibrio",
    aka: "Vibriosis",
    category: "Bacteria",
    summary:
      "Linked to raw or undercooked shellfish — especially oysters — and to wounds exposed to salt or brackish water.",
    matchTerms: ["vibrio"],
    signs: [
      "Watery diarrhea, often with stomach cramping, nausea, vomiting",
      "Fever and chills",
      "For Vibrio vulnificus: dangerously low blood pressure and blistering skin lesions",
      "For wound infection: redness, pain, swelling, warmth, and discoloration around the wound",
    ],
    onset: "Usually within 24 hours of exposure; up to 3 days",
    duration: "About 3 days for mild intestinal illness",
    spread:
      "Eating raw or undercooked shellfish, or exposing an open wound to salt water or brackish water.",
    care: [
      "Mild intestinal illness usually resolves with fluids and rest.",
      "Vibrio vulnificus bloodstream and wound infections are medical emergencies that can progress within hours. Seek care immediately for a rapidly worsening wound after salt-water exposure, or for fever and blistering skin after eating raw shellfish.",
    ],
    riskNotes: [
      {
        group: "liverDisease",
        severity: "urgent",
        text: "CDC: people with chronic liver disease are far more likely to get a severe Vibrio vulnificus infection, which can be life-threatening. Avoid raw oysters and keep wounds out of salt and brackish water.",
        source: cdcVibrioRisk,
      },
      {
        group: "immunocompromised",
        severity: "urgent",
        text: "CDC: a weakened immune system raises the risk of severe Vibrio vulnificus infection. Avoid raw shellfish and seek care quickly for symptoms.",
        source: cdcVibrioRisk,
      },
      {
        group: "age65",
        severity: "elevated",
        text: "Older adults are more likely to develop severe vibriosis and to require hospitalization.",
        source: cdcVibrioRisk,
      },
    ],
    source: cdcVibrio,
  },
  {
    id: "shigella",
    name: "Shigella",
    aka: "Shigellosis",
    category: "Bacteria",
    summary:
      "Extremely contagious — swallowing just a few dozen bacteria can cause illness. Spreads readily in childcare settings and households.",
    matchTerms: ["shigella"],
    signs: [
      "Diarrhea, often bloody or containing mucus",
      "Fever",
      "Stomach pain",
      "Feeling the need to pass stool even when the bowels are empty",
    ],
    onset: "1 to 2 days after exposure (up to 7 days)",
    duration: "5 to 7 days",
    spread:
      "Person to person via contaminated hands and surfaces, contaminated food or water, and sexual contact. The infectious dose is very small.",
    care: [
      "Most people recover with rest and fluids.",
      "CDC notes that Shigella is increasingly resistant to antibiotics, so treatment decisions and any testing should come from a healthcare provider.",
      "Wash hands carefully and do not prepare food for others while sick — Shigella spreads easily within a household.",
    ],
    riskNotes: [
      {
        group: "under5",
        severity: "elevated",
        text: "Children under 5 have the highest rate of Shigella infection, and it spreads quickly in childcare settings.",
        source: cdcShigella,
      },
      {
        group: "immunocompromised",
        severity: "elevated",
        text: "People with weakened immune systems may have more severe and longer-lasting illness. Contact a provider early.",
        source: cdcShigella,
      },
    ],
    source: cdcShigella,
  },
];

/* ------------------------------------------------------------------ */
/* Red flags — CDC's own "when to see a doctor" criteria               */
/* ------------------------------------------------------------------ */

export const RED_FLAGS: string[] = [
  "Bloody diarrhea",
  "Fever higher than 102°F (38.9°C)",
  "Diarrhea lasting more than 3 days without improving",
  "So much vomiting you cannot keep liquids down",
  "Signs of dehydration: little or no urination, very dry mouth and throat, or dizziness when standing up",
];

export const RED_FLAG_SOURCE = cdcFoodPoisoningSymptoms;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Risk notes for a pathogen matching the user's selected conditions. */
export function notesForGroups(p: Pathogen, selected: Set<RiskGroupId>): RiskNote[] {
  if (selected.size === 0) return [];
  return p.riskNotes.filter((n) => selected.has(n.group));
}

/** True when any matching note is an urgent one — drives card ordering. */
export function hasUrgentNote(p: Pathogen, selected: Set<RiskGroupId>): boolean {
  return notesForGroups(p, selected).some((n) => n.severity === "urgent");
}

/** Match a pathogen card to a live outbreak's free-text pathogen field. */
export function matchesOutbreakPathogen(p: Pathogen, pathogenText: string): boolean {
  const hay = pathogenText.toLowerCase();
  return p.matchTerms.some((t) => hay.includes(t));
}

export function riskGroupLabel(id: RiskGroupId): string {
  return RISK_GROUPS.find((g) => g.id === id)?.label ?? id;
}
