# OpenCORE redesign build brief (Guide Map world)

You are rebuilding part of a React 19 + Vite + Tailwind v4 app onto a new visual system that already exists in the tree. Read this whole file, then the files it names, before editing. Project root: /Users/christopherquarcoo/Documents/open-core.

## Hard rules

- Edit ONLY the files assigned to you. Never touch any other file, never create new files unless your assignment says so, never run git commands that stage, commit, reset or checkout. Another session commits on this branch.
- Preserve every behavior, data flow, copy string that states a fact, citation link, aria attribute, live region, focus management and reduced-motion handling that exists in the file today. You are changing the look and the layout, not what the page says or does. Rewording copy is allowed only to drop decorative hedges; never add claims, never say "safe".
- Remove every `@heroui/react` import (Card, Spinner, Chip from HeroUI). `@heroui/styles` is gone, so HeroUI class names (`card__title`, `chip--danger`) render nothing.
- Use the primitives below. Do not invent new utility classes or colours; do not write hex values in components (the two map marker colours are the exception, already set).
- Typecheck when done: `npm run typecheck`. Fix errors only in your own files; report errors in other files back in your summary.
- Finish by listing the files you changed and anything you could not resolve.

## The world: a folded guide map

Flat, unmodulated colour and nothing else. No gradients, no shadows, no glass, no grain, no tinted translucent fills (`bg-x/10`), no coloured left borders, no emoji. Green land swells on a cream ground; ink does the talking; coral, sun, pond and lilac appear only as capsule fills and label chips, always with ink text on them. One typeface (Schibsted Grotesk, already loaded): display headings are extra-bold with tight leading, body is regular. Lists keep one fixed column grid in every state. Dark theme is handled by tokens; never write `dark:` variants.

Refuse: same-size card grids as page structure; KPI/stat tiles (big number + small label in a box); eyebrows/kickers (a small uppercase label above a heading); section numbers; modals for things that need no interruption; uppercase tracked labels as a style.

Prefer: ruled rows (`row-rule`) over cards for lists; one Sheet for a self-contained record; one Lobe per page for the focused region; capsules for every control.

## Tokens (Tailwind colour names, all theme-aware)

`bg-ground` cream page ground · `bg-paper` white sheet surface · `text-ink` primary text · `text-ink-2` secondary text (5.8:1) · `border-rule` hairline · `border-ink` strong outline · fills `bg-land` `bg-coral` `bg-sun` `bg-pond` `bg-lilac` (ink text on each: use `text-on-fill` only if you must, the primitives handle it) · `text-land-deep` for green icons on the ground (never for text) · `text-pond-ink` is the link colour (use the `link` class instead).

Legacy names still resolve (`text-muted-foreground` = ink-2, `bg-card` = paper, `text-primary` = ink, `border` = rule) but replace them as you go so the file reads in the new vocabulary.

## CSS component classes (src/index.css)

- `display` extra-bold, 0.95 leading, tight tracking; pair with a size: `display text-4xl sm:text-5xl` for h1, `display-md text-2xl` for h2/h3.
- `lobe` the flat green region with organic corners (`lobe--soft` for calmer corners in flow; `lobe--pond|sun|lilac|coral` other fills; `lobe__water` a cream cutout inside a lobe). Ink text inside.
- `sheet` white surface with a 1.5px ink outline and organic corners; `sheet--quiet` hairline outline.
- `capsule` the control: pill, 2px ink outline, paper fill, semibold. Modifiers: `capsule--sm`, `capsule--ink` (ink fill), `capsule--sun|coral|pond|lilac|land`, `capsule--ghost`. Add `<span aria-hidden class="capsule__chip" />` as the last child to get the round chip; a capsule with `aria-pressed="true"`, `data-state="active"` or `aria-current="page"` turns ink and flips the chip to the leading edge automatically, so toggles and tabs need no conditional classes.
- `field` the input strip (pill, ink outline, paper).
- `chip` label chip: `chip--coral` (most serious / active) `chip--sun` (moderate / alert) `chip--pond` (USDA FSIS) `chip--land` (CDC/FDA named source) `chip--lilac` (category / hazard type) `chip--outline` `chip--quiet` (neutral).
- `row-rule` bottom hairline for list rows (last child gets the strong rule).
- `link` underlined pond-ink link. `prose-measure` 62ch. `tnum` tabular numerals. `ease-over` the overshoot easing for transitions.

## React primitives

- `src/components/ui/button.tsx`: `<Button variant="default|ink|sun|coral|pond|lilac|land|ghost" size="default|sm" chip live asChild>`; svg children are sized automatically. There is no `outline` or `icon` variant: outline is the default, an icon-only button is `size="sm"` with `className="px-3"` and an aria-label.
- `src/components/ui/chip.tsx`: `<Chip color="coral|sun|pond|lilac|land|outline|quiet">`. No `size`, no `variant` props: delete them at every call site. `classificationChip(c)`, `statusChip()`, `agencyChip()`, `outbreakStatusChip()` from `src/lib/classification.ts` return `{ color }` ready to spread.
- `src/components/ui/input.tsx` `<Input>` renders a `field`. `src/components/ui/select.tsx` `<Select>` native select as a capsule. `src/components/ui/tabs.tsx` Radix tabs as capsules. `src/components/ui/dialog.tsx` sheet dialog.
- `src/components/common.tsx`: `SourceLink`, `OutLink`, `Lobe` (`tone`, `soft`), `Sheet` (`quiet`), `SectionHeading` (`count`, `icon`, `actions`, `as`), `EmptyState`, `InfoNote` (a quiet sheet), `Loading` (spinner line with role=status), `MapsDisabledNote` (`page`).
- Already rebuilt, use as-is: `PageHeader` (`title`, `description`, `actions`; no `icon` prop any more, drop it), `TopNav`, `Wordmark`/`Mark`, `ZipInput`, `FoodRow` + `FoodRowHeader` + `FOOD_GRID` (src/components/FoodRow.tsx), `OutbreakTile`, `RecallRow` (props: `recall`, `showHaveIt`, `children`), `RecordLine`/`recordRule`, `ReachLine`, `ContaminantBadge`, `FreshnessBadge`, `KeyButton` (`variant="button"|"link"`), `Disclosure` (`label`, `icon`, `open`, `onOpenChange`, `id`, `description`), `App.tsx` (footer carries the one standing disclaimer; do not repeat the disclaimer on pages).
- `src/components/FoodTile.tsx` and `src/components/StatCard.tsx` are legacy and must not be imported by anything you touch; use `FoodRow` and a ruled facts list instead.

## Page anatomy

Every page: `PageHeader` at top (display h1, one short description, actions such as `KeyButton` and `FreshnessBadge` on the right), then sections separated by `space-y-10`. Section headings are `SectionHeading` or an `h2.display-md.text-2xl` with an optional one-line `text-sm text-ink-2 prose-measure` under it. Lists are ruled rows. Loading uses `<Loading>…</Loading>`, empty uses `<EmptyState>`. Back links are `capsule capsule--sm capsule--ghost` with an ArrowLeft icon. Secondary calls to action are capsules; the one primary action on a page is `capsule--ink` or `capsule--sun`.

Motion: only `transition-transform ease-over` on hover for links that are whole sheets, and the capsule chip pop that already exists. No entrance animations.

Phones first: every grid collapses to one column under `md`, text never overflows, tap targets are at least 44px (capsules already are).
