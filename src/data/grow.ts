/** Static, curated grow-your-own content. Plain data → rendered as cards. */

export interface GrowGuide {
  id: string;
  title: string;
  blurb: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  timeToHarvest: string;
  steps: { heading: string; body: string }[];
  tips: string[];
}

export const GROW_GUIDES: GrowGuide[] = [
  {
    id: "seeds",
    title: "Sourcing high-quality seeds",
    blurb:
      "Good seed is the cheapest lever you have. Buy from reputable sources, favor open-pollinated varieties you can re-save, and check germination rates before you commit a whole bed.",
    difficulty: "Beginner",
    timeToHarvest: "n/a — planning step",
    steps: [
      {
        heading: "Pick a trustworthy supplier",
        body: "Order from established seed houses that publish germination test dates and lot numbers (e.g. Johnny's, Baker Creek, High Mowing, Territorial, Southern Exposure). Local seed libraries and regional co-ops carry varieties adapted to your climate.",
      },
      {
        heading: "Choose the right seed type",
        body: "Open-pollinated (OP) and heirloom seeds breed true, so you can save seed year to year. F1 hybrids are vigorous but won't come true from saved seed. Look for 'disease-resistant' codes on the packet if a pathogen is common in your area.",
      },
      {
        heading: "Read the packet",
        body: "Note days-to-maturity, sun needs, spacing, and the packed-for/germination date. Fresher seed germinates better; most seed stays viable 2–4 years stored cool and dry.",
      },
      {
        heading: "Test germination",
        body: "Roll 10 seeds in a damp paper towel in a zip bag at room temperature. Count sprouts after the packet's germination window. 8/10 = ~80% — sow accordingly.",
      },
    ],
    tips: [
      "Store leftover seed in an airtight jar with a silica packet, in the fridge.",
      "Certified organic seed avoids fungicide coatings if you're growing organically.",
      "Start with easy wins: lettuce, radish, bush beans, and leaf herbs.",
    ],
  },
  {
    id: "garden",
    title: "Growing in a garden or backyard",
    blurb:
      "A 4×8 raised bed can supply a household with salad greens and herbs most of the season. Sun, soil, and water are the whole game.",
    difficulty: "Beginner",
    timeToHarvest: "30–70 days for most greens",
    steps: [
      {
        heading: "Find your sun",
        body: "Most vegetables want 6+ hours of direct sun. Leafy greens tolerate partial shade (4–5 hrs). Watch a spot for a day before committing.",
      },
      {
        heading: "Build good soil",
        body: "Raised beds or containers filled with a mix of compost and quality garden soil beat native clay for beginners. Aim for loose, dark, sweet-smelling soil. A cheap soil test tells you pH (target 6.0–7.0 for most crops).",
      },
      {
        heading: "Sow and space",
        body: "Direct-sow greens, radishes, and beans; transplant tomatoes and peppers after your last frost. Follow packet spacing — crowding invites disease.",
      },
      {
        heading: "Water and mulch",
        body: "Deep, consistent watering at the base (not the leaves) plus 1–2 inches of mulch keeps soil moist and splash-borne pathogens off your greens.",
      },
      {
        heading: "Harvest clean",
        body: "Pick greens in the morning, rinse in cool water, and refrigerate promptly. Cut-and-come-again harvesting of outer leaves keeps plants producing for weeks.",
      },
    ],
    tips: [
      "Succession-sow a short row of lettuce every 2 weeks for a steady supply.",
      "Wash hands and tools; keep pets out of beds to reduce contamination risk.",
      "Row cover fabric keeps pests off without sprays.",
    ],
  },
  {
    id: "microgreens",
    title: "Growing microgreens indoors",
    blurb:
      "Microgreens are the fastest path from seed to salad — 7 to 21 days on a windowsill, no garden required. Nutrient-dense and nearly foolproof.",
    difficulty: "Beginner",
    timeToHarvest: "7–21 days",
    steps: [
      {
        heading: "Gather a tray",
        body: "Any shallow food-safe tray (1–2 in deep) with drainage. Fill with 1 inch of moist seed-starting mix or a hydroponic mat.",
      },
      {
        heading: "Sow densely",
        body: "Scatter seed thickly across the surface (pea, radish, sunflower, broccoli, and kale are reliable). Press in gently; mist. No need to bury.",
      },
      {
        heading: "Blackout then light",
        body: "Cover for 3–4 days to encourage even sprouting, then move to bright light (south window or a cheap LED). Keep the surface evenly moist by misting.",
      },
      {
        heading: "Harvest",
        body: "When the first true leaves appear, snip just above the soil line with clean scissors. Rinse, dry, and eat within a few days.",
      },
    ],
    tips: [
      "Bottom-water to avoid wetting the greens and inviting mold.",
      "Buy seed sold specifically for sprouting/microgreens to reduce contamination risk.",
      "Good airflow (a small fan) prevents damping-off.",
    ],
  },
  {
    id: "hydroponics",
    title: "Hydroponic growing at home",
    blurb:
      "Soil-free growing gives fast, clean greens in a small footprint. A simple Kratky jar needs no pump; a deep-water-culture tote scales up to a weekly harvest.",
    difficulty: "Intermediate",
    timeToHarvest: "28–45 days for lettuce",
    steps: [
      {
        heading: "Pick a method",
        body: "Kratky (passive, no electricity) is the easiest start: a lidded jar with a net cup. Deep Water Culture (DWC) adds an air pump for faster growth. Nutrient Film Technique (NFT) suits larger setups.",
      },
      {
        heading: "Start seedlings in plugs",
        body: "Germinate seeds in rockwool or coco plugs until roots emerge, then set the plug into a net cup.",
      },
      {
        heading: "Mix nutrients and check pH",
        body: "Use a complete hydroponic nutrient at label strength. Keep pH 5.5–6.5 (cheap meter or drops) and EC per the crop. Top off water as plants drink it.",
      },
      {
        heading: "Light and airflow",
        body: "Leafy greens want 12–14 hrs of light. A full-spectrum LED over the setup and gentle airflow prevent stretch and mold.",
      },
      {
        heading: "Keep it clean",
        body: "Rinse the reservoir between crops and keep light off the nutrient solution to stop algae. Clean systems mean clean greens.",
      },
    ],
    tips: [
      "Butterhead and loose-leaf lettuces are the friendliest hydroponic crops.",
      "Label your nutrient bottles and keep them out of sunlight.",
      "One 5-gallon DWC tote with 4 sites yields a head of lettuce roughly weekly once staggered.",
    ],
  },
];
