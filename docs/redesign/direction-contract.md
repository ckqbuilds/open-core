---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/FoodsPage.tsx","src/pages/RecallsPage.tsx","src/pages/OutbreaksPage.tsx","src/pages/OutbreakPage.tsx","src/pages/FoodPage.tsx","src/pages/LearnPage.tsx","src/pages/ShopLocalPage.tsx"]
---

## Scope

Whole-app redesign (every route under src/App.tsx), Operate mode. Audience: a worried member of the US public on a phone, often in a store aisle; caregivers of at-risk people. Job: "is my food affected, what do I do?" answered first, cited, calm. Constraints: record-only copy and disclaimers stay; routes, data and features stay; sections may be reordered or merged. User refuses: generic SaaS dashboard, alarmist red, .gov feel. Chosen on 2026-10-23 from a dealt hand: the Guide Map challenger (catalog aww2-zoo-gardens-guide-map), over the assigned Fridge Safety Card.

## Direction contract

THESIS: The food in focus is the one place on the page that swells; everything else sits flat on the ground. Refuses the KPI-row-over-card-grid arrangement and the stat tile.

OWN-WORLD: Flat unmodulated colour, no grain, no shadow: land green #8ED462, cream ground #F5F1E4, ink #2C2E2A; coral #FF705D, sun #F5E211, pond #2BA0FF, lilac #EBC1FF only as capsule fills and labels, ink text on every fill. One grotesk, Schibsted Grotesk, display bold at 0.95 leading and -0.06em tracking, body regular. Capsule controls with a round ink chip riding the trailing edge that crosses to the leading edge when live. Lists keep one fixed column grid in every state. Dark theme: deep ink ground, cream ink, same green lobe.

STORY: The visitor reads one answer line, sees the foods tied to active outbreaks inside the green lobe, searches or types a barcode, and leaves with a cited next step.

FIRST VIEWPORT: Thin cream band: wordmark, five nav links, ZIP capsule (sun). Left 40%: answer headline at 64px ("12 recalls reach Texas right now."), one-line sub, search field + "Check a barcode" capsule, then a two-column fixed-grid list of remaining foods with counts. Right 60%: one green lobe bleeding off top and right edges carrying the active-outbreak foods as cream capsules pinned to its coast, each with pathogen, cases, recalls, reach. Primary action: the barcode capsule.

FORM: Guide Map, the competitive challenger; my grounded list led with the Nutrition Facts panel, assigned index 5 was the Fridge Safety Card. seed:a83d4475b52527d3

Signature interaction: the lobe's coastline is one SVG path; on scroll it eases 0.4s with overshoot as the focused section changes; capsules flip their chip edge when live. Reduced motion: static coast, instant chip.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Whether the FeaturedLocal spotlight stays on home (kept, under the lobe). Camera scanning remains deferred.
