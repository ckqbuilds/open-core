# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: a worried member of the US public**, at home or standing in a store, who has bought or eaten a food and wants to know whether it is affected by a current recall or outbreak, and what to do about it. They arrive anxious, often from a news headline, and may be in a hurry on a phone. Many have no idea what "Class I", "FSIS", or "CORE" mean.

**Secondary (confirmed): caregivers for at-risk people**, shopping or cooking for pregnant, elderly, very young, or immunocompromised household members. The risk-group selection in the Learn section and the pathogen cards exist for them; their stakes are higher and their patience for hedged language is lower.

Researchers and journalists use the cited record too, but they are not the audience design decisions are made for.

## Product Purpose

OpenCORE is a public food-safety dashboard for the United States. It merges three official feeds into one picture: FDA food recalls (openFDA enforcement), the FDA CORE outbreak investigation table with CDC investigation detail, and USDA FSIS meat, poultry and egg recalls. It groups that activity by food commodity, lets a visitor check a product barcode against the recall record, maps the companies and locations an official record names near a ZIP, surfaces local food sources (USDA Local Food Directories) as a safer-sourcing alternative, and explains the illnesses and hazard types in plain language.

Success is a person getting a true, cited answer to "is my food affected, and what should I do?" in under a minute, and leaving calmer and better informed than they arrived. Failure is a person concluding something the official record does not say, in either direction.

The name: CORE is the FDA's Coordinated Outbreak Response and Evaluation network, whose outbreak table the app transcribes. "Open" is both the openFDA/open-data lineage and the MIT license.

## Positioning

**Record-only honesty.** Nothing appears in OpenCORE unless an official FDA, CDC, or USDA FSIS record names it. A company is listed only when the record names it or names a branded product it sells. Risk is never inferred from supplier relationships. Every entity, number and outbreak carries a citation link the UI must surface. The product never says a food, product or location is "safe"; the strongest reassurance it offers is "not named in any current record." This rule is enforced in code (`src/data/outbreaks.ts` integrity rules) and is the one claim a neighboring recall aggregator could not truthfully copy, because it was written after a supplier recall wrongly damaged a restaurant chain's reputation through repeated unverified supply-chain links.

Secondary differentiators that follow from it: three agencies in one place, grouped by what people actually eat; ZIP-aware local context; local alternatives rather than only warnings.

## Operating Context

- Public website, run and curated by the maintainer alone (GitHub `ckqbuilds/open-core`, MIT). A single Node process serves the built app and the chat API; the FDA CORE scraper runs on a cron every 6 hours on a Raspberry Pi and writes `public/outbreaks.json`; the FSIS scraper writes `public/fsis-recalls.json`. If a scrape is missing, the app falls back to curated outbreaks so nothing disappears.
- Live data arrives from the browser (openFDA, Open Food Facts for barcode identity, api.zippopotam.us for ZIP centroids, Mapbox Search Box and GL for locations) and from the server (USDA Local Food Directories). Open Food Facts only identifies a product; it is never a safety authority.
- Hand-verified enrichment (named retailers, guidance, hospitalizations, states) lives in `src/data/outbreaks.ts`, keyed by FDA reference number and merged onto live rows. Adding first-class detail for a new outbreak is a manual research task with citations.
- Optional features degrade honestly when unconfigured: no Mapbox token hides maps and location search; no AI provider hides the chat widget. The chat, when present, is grounded only in the recalls and outbreaks the app has loaded.
- The same data is exposed to AI clients through a standalone MCP server in `mcp/` (`opencore-mcp`), under the same integrity rule.
- The visitor's situation is often a phone, one-handed, interrupted, possibly in a store aisle; ZIP is persisted locally so it survives a return visit.

## Capabilities and Constraints

- Foods are a **display grouping** of what the feeds name, never a risk judgment on a whole category. The UI must keep saying so.
- Recall records are the agencies' own text. Product descriptions, distribution strings and firm names arrive raw (lot codes, foodservice case sizes, ALL CAPS, occasional encoding errors) and must be presented without altering their factual content; summarising and grouping is allowed, rewriting the record is not.
- Recall classification (Class I/II/III, Public Health Alert) and status (Ongoing/Completed/Terminated) follow each agency's own definitions. Hazard type (biological, chemical, physical, allergenic) is a heuristic derived from the recall's reason text, not an official field, and the UI must say so wherever it shows it; an unclassifiable reason belongs in an honest "other" bucket, not a reassuring one.
- openFDA has no CORS restriction and is rate-limited without a key; fda.gov sends no CORS headers, hence the server-side scrape. Mapbox tokens are public `pk.` tokens restricted by URL; secrets never ship to the client.
- Terminology the product uses and must keep consistent: outbreak (CDC/FDA investigation), recall (FDA or FSIS enforcement action), public health alert (FSIS warning without a recall), named entity / named in the official record, reference number (FDA CORE), curated (fallback data when the live feed is unavailable).
- **Undecided:** the default time window and status filter for the recalls feed (the maintainer has chosen to narrow the default to Ongoing + last 90 days, with older records under an archive; implementation pending). Camera barcode scanning is a deferred backlog item needing an on-device decoder and HTTPS. Whether the public site has a fixed domain is not recorded here.

## Brand Commitments

- Name: **OpenCORE**, with "CORE" capitalised. Current mark is a scroll-text (record) glyph, chosen because a shield-check would read as "verified safe"; no logo asset beyond `public/favicon.svg`.
- Voice: plain-spoken, precise, calm under alarm. Says what the record says and no more. Never says "safe." Explains agency jargon inline the first time it appears. Disclaimers are factual, not legalistic. Treats the reader as capable of deciding for themselves once given the cited facts.
- Standing disclaimer that must remain reachable on every surface: not medical or official guidance; always confirm against the linked FDA/CDC/FSIS sources; if ill, contact a healthcare provider.

## Evidence on Hand

- Live and scraped data: `public/outbreaks.json` (cron output, may be absent), `public/fsis-recalls.json` (189 records, generated 2026-08-06 at last check), openFDA at request time.
- Curated, cited outbreak detail in `src/data/outbreaks.ts`; pathogen and symptom reference in `src/data/symptoms.ts`; hazard-type reference in `src/data/contaminants.ts`; grow-your-own guides in `src/data/grow.ts`.
- No testimonials, usage numbers, press, partnerships, or endorsements exist. Do not fabricate any. The FDA, CDC and USDA are data sources, not partners, and must not be presented as endorsing the product.
- A design critique snapshot (2026-10-23, 24/40) lives in `.impeccable/critique/`.

## Product Principles

1. **The record is the ceiling.** Show exactly what an official source says, cite it, and stop. Grouping and summarising are allowed; inference is not.
2. **Answer the visitor's question first.** The question is "is *my* food affected and what do I do?", not "how many recalls were there this month." Personal and local context (ZIP, what they bought) comes before aggregate statistics.
3. **Calm is a feature.** A scared reader must leave more informed and less panicked. Explain before alarming, give a next step after every warning, and let reassurance ("not named") land as clearly as a warning does.
4. **Degrade honestly.** Missing tokens, stale scrapes, and unavailable feeds are stated plainly in the visitor's language, never hidden and never shown as developer instructions.
5. **One vocabulary, every agency.** FDA, CDC and FSIS terms are explained the same way in every place they appear, so a reader learns the system once.

## Accessibility & Inclusion

A public health tool for the general US public: keyboard and screen-reader completeness of the core flow (find a food, read its recalls, check a barcode, enter a ZIP) and WCAG AA contrast are product requirements, not polish. Loading, filtering and verdict results must be announced, not only shown. Plain-language explanations of medical and regulatory terms serve readers with limited health literacy as much as first-timers. Reduced-motion preferences are respected.
