---
name: OpenCORE
description: A folded guide map for the US food-safety record; flat colour, ink text, one green lobe per page.
colors:
  ground: "#f5f1e4"
  paper: "#ffffff"
  ink: "#2c2e2a"
  ink-2: "#5b5e57"
  rule: "#cfcab7"
  rule-strong: "#2c2e2a"
  land: "#8ed462"
  land-deep: "#5fa63a"
  coral: "#ff705d"
  sun: "#f5e211"
  pond: "#2ba0ff"
  pond-ink: "#0b5fb5"
  lilac: "#ebc1ff"
  on-fill: "#2c2e2a"
  status-critical: "#c13c2a"
  viz-grid: "#e3dfcf"
  viz-axis: "#b8b3a0"
  viz-s4: "#c9b400"
typography:
  display:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.06em"
  display-lg:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.06em"
  headline:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  label:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "normal"
  chip:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  control:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "normal"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  pill: "999px"
  sheet: "1.25rem 1.5rem 1.25rem 1.5rem / 1.5rem 1.25rem 1.5rem 1.25rem"
  water: "2rem 2.5rem 2.25rem 2rem / 2.25rem 2rem 2.5rem 2.25rem"
  lobe-soft: "2.5rem 3.5rem 3rem 2.75rem / 3rem 2.5rem 3.5rem 3rem"
  lobe: "48% 52% 45% 55% / 55% 45% 55% 45%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
  section: "40px"
  footer: "64px"
components:
  capsule:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1.1rem"
    height: "2.75rem"
  capsule-sm:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.85rem"
    height: "2.25rem"
  capsule-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1.1rem"
    height: "2.75rem"
  capsule-live:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1.1rem"
    height: "2.75rem"
  capsule-sun:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.on-fill}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1.1rem"
    height: "2.75rem"
  capsule-coral:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.on-fill}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1.1rem"
    height: "2.75rem"
  capsule-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1.1rem"
    height: "2.75rem"
  capsule-ghost-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 1.1rem"
    height: "3rem"
  field-invalid:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  chip-coral:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.on-fill}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.6rem"
  chip-sun:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.on-fill}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.6rem"
  chip-pond:
    backgroundColor: "{colors.pond}"
    textColor: "{colors.on-fill}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.6rem"
  chip-land:
    backgroundColor: "{colors.land}"
    textColor: "{colors.on-fill}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.6rem"
  chip-lilac:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.on-fill}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.6rem"
  chip-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.6rem"
  chip-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.6rem"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "20px"
  sheet-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sheet}"
    padding: "16px"
  lobe:
    backgroundColor: "{colors.land}"
    textColor: "{colors.on-fill}"
    rounded: "{rounded.lobe}"
    padding: "24px 24px 40px 32px"
  lobe-soft:
    backgroundColor: "{colors.land}"
    textColor: "{colors.on-fill}"
    rounded: "{rounded.lobe-soft}"
    padding: "24px"
  lobe-water:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.water}"
    padding: "16px"
  link:
    backgroundColor: "transparent"
    textColor: "{colors.pond-ink}"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.85rem"
    height: "2.25rem"
  nav-link-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.85rem"
    height: "2.25rem"
---

# Design System: OpenCORE

## Overview

**Creative North Star: "The Folded Guide Map"**

OpenCORE reads like a map you unfold in the aisle: cream water, one green land mass that swells past the edge of the page, and ink doing all the talking. The food in focus is the only thing on a page that rises; everything else sits flat on the ground as ruled rows and paper sheets. Colour is a legend, not a mood: coral, sun, pond and lilac appear only as capsule fills and label chips, each with a single fixed meaning, and the text on any fill is always ink. There is no grain, no gradient, no shadow, no glass, and no tinted translucent surface anywhere in the build.

The density is that of a reference sheet rather than a dashboard. Lists are ruled rows on a fixed column grid that holds in every state (loading, searching, empty), not card grids; a self-contained record (a recall, a pathogen, an urgent-care notice) is one paper sheet with an ink outline. The one typeface, Schibsted Grotesk, carries the whole hierarchy by weight and size: extra-bold display at 0.95 leading and tight tracking for answers and headings, regular for the record itself. Numerals are tabular only where runs of digits line up.

The world rejects the KPI row over a card grid, the stat tile (big number in a box), alarmist red as a surface colour, and the .gov feel. Warnings are chips on paper, never regions; reassurance ("not named") lands in the same ink as a warning. Motion is a single grammar: a 0.4s overshoot easing on the lobe's coastline, on capsule hover and on the round chip that pops when a control goes live.

**Key Characteristics:**
- Flat, unmodulated colour; depth comes from outline weight and the one filled lobe, never from shadow.
- One grotesk at two weights: 800 for display and titles, 400 for the record, 600 and 700 for controls and labels.
- Capsules for every control, with a round ink chip that crosses to the leading edge when the control is live.
- Ruled rows over cards; one fixed column grid per list in every state.
- Colour means severity or source, never decoration, and never carries prose.
- Dark theme by token swap only: deep ink ground, cream ink, the same green lobe and the same chip fills.

## Colors

A cream map ground, ink for every word, one green land, and four legend colours that only ever fill a capsule or a chip.

### Primary
- **Land Green** (`land`): the lobe fill. The focused region of a page (the active-outbreak foods on home, the barcode verdict, the local spotlight) lives inside one lobe; nothing else on a page gets this fill. Also the `chip-land` fill for a CDC/FDA named-source label ("Hand-verified detail") and the wordmark's mark.
- **Land Deep** (`land-deep`): the food icons on the cream ground, where the lighter land green would wash out. Icons only, never text; in dark theme it collapses to plain land green.

### Secondary
- **Coral** (`coral`): most serious or active. `chip-coral` is Class I, "Active outbreak", "Get medical care now"; `capsule-coral` is the ZIP capsule when the ZIP fails to resolve, `lobe-coral` the barcode verdict on an exact recall match; `field-invalid` turns the field outline coral. Never a region on its own and never prose.
- **Sun** (`sun`): moderate or an alert. `chip-sun` is Class II and an FSIS Public Health Alert, plus the feed-freshness notice; `capsule-sun` is the ZIP capsule in the nav and the one primary action on a page ("Check a barcode"); `lobe-sun` is the barcode verdict on a partial match. Text selection is sun with ink text.
- **Pond** (`pond`): the USDA FSIS feed (`chip-pond`), the caret, the local-source spotlight lobe (`lobe-pond`), and the first data-viz series.
- **Pond Ink** (`pond-ink`): the only coloured text in the system: underlined links at 5.7:1 on cream, lightened in dark theme. Prose stays ink.
- **Lilac** (`lilac`): category or hazard type (`chip-lilac`: Bacteria, Parasite, Virus; "Biological · inferred"). Hazard type is never coral; severity alone owns coral.

### Tertiary
- **Critical Text** (`status-critical`): the one deep red for inline error copy (ZIP and barcode errors, chat failures), because coral is too light to read as prose. Text only; it never fills anything.
- **Viz Grid / Viz Axis / Viz Series 4** (`viz-grid`, `viz-axis`, `viz-s4`): chart hairlines and the fourth series of the recall chart; series 1–3 reuse pond, coral and land-deep.

### Neutral
- **Cream Water** (`ground`): the page ground and the text colour on ink capsules; the `lobe-water` cutout lets it show through inside a lobe.
- **Paper** (`paper`): a sheet laid on the water: inputs, capsules at rest, sheets, dialog panels, the hover wash on a row.
- **Ink** (`ink`): all text, every outline that must be read (capsules, sheets, fields, the strong rule), the live capsule fill, and the dialog overlay at 50%.
- **Ink 2** (`ink-2`): secondary text at 5.8:1 on cream: descriptions, column headers, counts, placeholders, the "not listed" state.
- **Rule** (`rule`): the hairline between rows, the quiet sheet outline, the dotted leader on a record line.
- **Rule Strong** (`rule-strong`): ink-coloured; the last row's bottom rule, the sheet outline, the footer's top rule.
- **On Fill** (`on-fill`): ink in both themes; the text and chip colour on every coloured fill.

### Dark theme
Tokens swap at `.dark` or `[data-theme="dark"]` with nothing else changing: ground `#1f2220`, paper `#2c2e2a`, ink `#f5f1e4`, ink-2 `#c9c4b2`, rule `#43463f`, rule-strong `#f5f1e4`, pond-ink `#7cc0ff`, land-deep collapses to land, status-critical `#ff9a8a`, viz-grid `#3a3d37`, viz-axis `#5b5e57`, viz-s4 becomes sun. Land, coral, sun, pond, lilac and on-fill keep their light values, so every chip and the lobe look identical in both themes. Components never write `dark:` variants.

### Named Rules
**The Legend Rule.** Each colour means one thing: coral = most serious or active, sun = moderate or an alert, pond = the USDA FSIS feed, land = a CDC/FDA named source, lilac = category or hazard type, outline or quiet = neutral. The mapping lives in one place (`src/lib/classification.ts`) so the Key legend cannot drift from the rows.

**The Ink-on-Fill Rule.** Text and the round chip on any coloured fill are ink (`on-fill`) in both themes. No coloured fill ever carries prose; the longest text a fill holds is a capsule label or a verdict heading.

**The One Lobe Rule.** One filled region per page: the lobe. Everything else sits on the ground as ruled rows or an outlined paper sheet. The Learn urgent-care block is a sheet with a coral chip, not a coral region; a warning is a chip on paper, never a tinted surface.

## Typography

**Display Font:** Schibsted Grotesk (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Schibsted Grotesk (same family)
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas, monospace (reference numbers only)

**Character:** One grotesk, loaded 400–900 with italics, with `ss01` and `cv01` on. Hierarchy is carried entirely by weight and size: extra-bold answers set tight and low, regular record text set at a reading measure. Nothing is uppercase-tracked; there are no eyebrows, kickers or section numbers.

### Hierarchy
- **Display** (800, 2.25rem rising to 3rem at `sm`, 0.95 leading, -0.06em): every page's h1 through `PageHeader`; the home answer line goes to 3.75rem at `sm` (`display-lg`), and the local spotlight's place name sits at 1.875rem/2.25rem in the same style.
- **Headline** (800, 1.5rem, 1.0 leading, -0.04em): section headings (`display-md`), dialog titles, verdict titles, the outbreak "What to know" heads; 1.25rem for Learn sub-cards.
- **Title** (800, 1.125rem, tight leading): the lead of a row: a food name, a firm name, a pathogen, the food in a lobe capsule. The row title is bold, never larger.
- **Body** (400, 1rem, 1.5 leading): page descriptions and record text, at a 62ch measure (`prose-measure`); 600 for a recall's reason line.
- **Body Small** (400, 0.875rem): the dominant text size of the build (rows, chips' neighbours, notes, reach lines); ink-2 when secondary.
- **Label** (700, 0.75rem): column headers, "Product record", the record line, source links. Sentence case, no tracking.
- **Chip** (700, 0.78rem, 1.3 leading): label chips.
- **Control** (600, 1rem; 0.875rem on small capsules): every capsule.
- **Mono** (0.75rem, tabular): the reference number inside a record line and the outbreak reference chip, because the number is data.

### Named Rules
**The Digit-Run Rule.** Tabular numerals (`tnum`) apply only to runs of two or more digits, never to a whole line; the face widens commas, spaces and a lone 1 under tnum. Mixed strings go through the `Digits` helper, which wraps each `\d{2,}` run.

**The Weight-Means-Reach Rule.** In a reach line, weight carries one meaning: extra-bold when a notice reaches the reader's state, semibold ink-2 when it does not.

## Layout

A single centred container (1240px at `2xl`, 1.25rem side padding) under a sticky 4rem nav band on 95% ground with a light blur. Pages open with `PageHeader` (display h1, a 62ch description, actions to the right) and then stack sections at 40px (`space-y-10`), with 16–24px inside a section and 6–12px between a row's own lines; the footer sits 64px below under a 2px ink rule.

Home is the one two-part first viewport: the answer column on the left (headline, sub, search field and ZIP field, "Check a barcode"), and the land lobe on the right bleeding off the top and right edges at `lg` (negative margins out to the viewport edge, 12% left padding so every line stays inside the coast). Under it the full list of foods runs in one ruled list on a fixed four-column grid (food 1.3fr, named-with 1fr, recalls 7rem, reaches-you 8.5rem).

Lists are ruled rows on a fixed `md:` column grid declared once per list (`FOOD_GRID`, the outbreak row grid, the recall row's 6.5rem date margin + body) and kept in every state; a column header row shares the same grid and hides on phones. Below `md` every grid collapses to one column, text wraps, and nothing overflows. Tap targets are at least 40px on touch screens: capsules are 2.75rem; small capsules are 2.25rem on pointer screens and grow to 2.5rem under `(pointer: coarse)`, with `min-h-11` where they stand alone; the wordmark link is `min-h-10`; text and record links take the same 2.5rem via `pointer-coarse:min-h-10`. Dialogs are a sheet centred at `max-w-lg`, `calc(100% - 2rem)` wide, 90vh tall.

## Elevation & Depth

No shadows. Depth is drawn, not lit: a 2px ink outline makes a control, a 1.5px ink outline makes a sheet, a hairline makes a row, and the lobe is the one plane that rises because it is the only large fill. The dialog overlay is ink at 50%, the panel a sheet on top. Hover on a capsule is a 1px lift in transform only; hover on a row is a paper wash. Shadows, gradients, grain, glass and translucent tints are absent from the build.

### Named Rules
**The Outline-Not-Shadow Rule.** Every surface declares itself with a stroke (2px ink for controls, 1.5px ink for sheets, 1.5px rule for rows), never with a shadow. The motion grammar is one easing, `cubic-bezier(0.34, 1.56, 0.64, 1)` over 0.4s (the overshoot), used for the coast morph, the capsule lift, the chip pop and the row arrow; the only other transitions are 0.2s colour fades.

## Shapes

Two silhouettes. Controls are pills (999px): capsules, fields, chips, the ZIP capsule, the round 0.9rem chip. Surfaces are organic: the sheet uses an uneven eight-value radius so no two corners match, the in-flow lobe a larger one, and the bleeding lobe is one SVG coast path (`viewBox 0 0 100 100`, non-uniform scaling) that runs off the top and right edges and swells unevenly down the left. The `lobe-water` cutout inside a lobe uses a third organic radius. Legacy 0.5/0.75/1rem radii survive only on a row's hover wash and the wordmark link. Borders are always full strokes; coloured left borders do not exist.

## Components

### Buttons (Capsules)
Every button, tab, nav link, toggle and select is a capsule: confident and tactile, never flat text.
- **Shape:** pill (999px), 2.75rem min height, 0.4rem 1.1rem padding, 0.6rem gap; small variant 2.25rem (2.5rem on coarse pointers), 0.2rem 0.85rem, 0.875rem text.
- **Default:** paper fill, 2px ink outline, ink text, 600 weight.
- **Ink:** ink fill, ground text: the one primary action on a page, shared with sun.
- **Sun / Coral / Pond / Lilac / Land:** the fill is also the border; text and chip are on-fill ink.
- **Ghost:** transparent fill and border; hover fills paper. Nav links and back links.
- **Hover / Active / Disabled:** translateY(-1px) with the overshoot; scale(0.97) on press; 45% opacity, no transform when disabled. Focus is the global 3px ink outline at 2px offset, with a 2px ground gap inside the ring and a 2px ground edge outside it.
- **The chip:** an optional 0.9rem round ink dot rides the trailing edge; when the capsule is live (`aria-current="page"`, `aria-pressed="true"`, `data-state="active"`, or `is-live`) the row reverses, the capsule turns ink, the chip turns ground and pops in from 0.2 scale with the overshoot. Toggles and tabs need no conditional classes.

### Chips
- **Style:** pill, 0.15rem 0.6rem padding, 0.78rem at 700, ink text, transparent 1.5px border so every colour sits on the same box; an optional 0.875rem inline icon.
- **Colours:** coral, sun, pond, land, lilac per the Legend Rule; outline (transparent, ink border) and quiet (paper, rule border) are neutral: Class III, Not Yet Classified, FDA agency, Ongoing/Completed status, Resolved, "FDA table only".
- **No states:** chips are labels, not filters; filters are capsules.

### Cards / Containers (Sheet)
- **Corner Style:** organic eight-value radius.
- **Background:** paper, ink text.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1.5px ink; `quiet` variant uses the rule hairline for notes, empty states and the maps-disabled note.
- **Internal Padding:** 20px (24px at `sm`) for a record sheet, 16px for an info note, 32px for an empty state.

### Lobe
The signature. One flat fill (land by default; pond, sun, lilac, coral variants) swelling past its box with on-fill ink text. `soft` is the in-flow form with calmer corners (the barcode verdict, the local spotlight); `coast` draws the edge as an SVG path behind the content, and `is-focused` morphs the path with the overshoot when the section in focus changes on scroll (Chromium interpolates `d`; other browsers keep the static coast; reduced motion freezes it). Foods pinned to the coast are paper capsules with a title-weight name, the pathogen, and a digit-run fact line. `lobe-water` opens a cream window inside a lobe for a list of records.

### Inputs / Fields
- **Style:** pill paper strip, 2px ink outline, 3rem min height, 1rem text; the select is the same strip with a chevron, kept native so phones open the OS picker.
- **Focus:** the global 3px ink outline, offset 2px, carried by a ground gap inside and a ground edge outside (both drawn with `box-shadow` spreads in the ground colour, the one place a box-shadow appears; it is a drawn edge, not a lit one); the caret is pond.
- **Error / Disabled:** `aria-invalid` turns the outline coral and the message below is critical text; disabled is 50% opacity.

### Navigation
A sticky 4rem band on ground at 95% with blur: wordmark (1.35rem, 800, -0.04em, with the green lobe mark), five small ghost capsules each carrying a chip, the sun ZIP capsule (coral when the ZIP fails, with a paper sheet note beneath), and a ghost theme toggle. The current page's capsule is ink with its chip at the lead. Under `md` the links fold into a sheet beneath the band, each link a full-width borderless capsule.

### Rows
A food, outbreak or recall is a ruled row (`row-rule`: 1.5px rule beneath, ink beneath the last) on its list's fixed grid, 14–20px vertical padding, the whole row a link where it links. Lead with a title-weight name, then ink-2 detail, chips in a 6px-gap wrap, the reach line, and the record line.

### Record Line
The citation, rendered through one component everywhere: a bold 0.75rem "Record" with a scroll icon, a dotted leader that fills the line at `sm` and up, then the agency, the reference number in mono tabular digits, the date, and any extra links, all in ink-2 with pond-ink links. It is ruled off from the body above by a dotted hairline.

### Dialog
Overlay ink at 50%; panel a sheet with 24px padding, display-md title, ink-2 description, a small capsule close button at the top right; 300ms fade and 95% zoom with the overshoot easing.

## Do's and Don'ts

### Do:
- **Do** put the focused region of a page in one lobe and leave everything else flat on the ground as ruled rows or outlined sheets.
- **Do** make every control a capsule (paper, 2px ink outline) and add the round chip so live state flips to ink with the chip at the lead automatically.
- **Do** keep chip colour to its one meaning (coral serious/active, sun moderate/alert, pond USDA FSIS, land CDC/FDA named source, lilac category/hazard type, outline/quiet neutral) by calling `classification.ts`.
- **Do** keep text on any fill ink (`on-fill`) in both themes, and keep prose ink or ink-2 with pond-ink reserved for links.
- **Do** give every list one fixed `md:` column grid and keep it in every state, collapsing to one column under `md`.
- **Do** set tabular numerals only on runs of two or more digits, through `Digits`.
- **Do** use the overshoot easing (0.4s, `cubic-bezier(0.34, 1.56, 0.64, 1)`) for the coast morph, capsule lift and chip pop, and 0.2s fades for colour; nothing else moves.
- **Do** cite every named entity through `RecordLine` or `SourceLink`, phrase a non-match as "not named in any current record", and leave the standing disclaimer to the footer once per page.

### Don't:
- **Don't** add shadows, gradients, grain, glass, translucent tints (`bg-x/10`) or coloured left borders; depth is outline weight and the one lobe.
- **Don't** make a coloured region out of a warning: the urgent-care notice is a sheet with a coral chip, never a coral surface, and coral never carries prose (errors use `status-critical` text).
- **Don't** build page structure from same-size card grids, KPI or stat tiles, eyebrows or kickers, section numbers, or uppercase tracked labels.
- **Don't** write hex values or `dark:` variants in components; every colour is a token in `src/index.css` and the dark theme is a token swap.
- **Don't** make hazard type coral or resolved status green; hazard type is lilac, resolved is quiet.
- **Don't** say "safe" anywhere in the interface, and don't use a shield mark: the mark is the green lobe with two ink lines.
