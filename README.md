# OpenCORE

A public dashboard for US food-safety awareness. It shows live FDA recalls and
active CDC outbreak data, the specific companies **named in the official record**,
farmers markets near a ZIP, and guides to grow your own produce.

## Run it

```bash
npm install
cp .env.example .env.local   # then paste your Mapbox pk.* token
npm run dev                  # http://localhost:5173
npm run build                # typecheck + production build
```

### Mapbox token (required for maps + location search)

The **Named locations** and **Farmers markets** tabs use Mapbox. Create a URL-restricted
**public** token (`pk.*`) at [account.mapbox.com](https://account.mapbox.com/access-tokens/),
restrict it to your domain plus `http://localhost:5173`, and set it in `.env.local`:

```
VITE_MAPBOX_TOKEN=pk.your_token_here
```

Without a token those two tabs show a "configure Mapbox" note; Recalls and Grow-your-own
work with no token. The token is a *public* `pk.` token by design — never put a secret
`sk.` token in client code.

## Sections

1. **Recalls & outbreaks** — every active FDA CORE outbreak as a tap-to-expand tile
   (progressive disclosure → modal with cited detail + share), plus a live
   [openFDA food enforcement](https://open.fda.gov/apis/food/enforcement/) recall feed
   filterable by severity class / status / distribution, and a D3 recalls-per-month chart.
2. **Named locations** — maps locations of FDA/CDC-named chains near a ZIP via
   Mapbox Search Box, with an interactive Mapbox map.
3. **Farmers markets** — nearby markets from Mapbox within 25 miles.
4. **Grow your own** — seed sourcing, backyard beds, microgreens, hydroponics.

Plus an in-app **AI chat** ("Ask about this") that explains the recalls/outbreaks near
you in plain language, and a standalone **MCP server** ([`mcp/`](mcp/README.md)) that
exposes the same data as tools for any MCP client.

## AI chat (provider-agnostic)

The chat runs through the Node server ([`server/`](server/index.mjs)) using the
OpenAI-compatible `/chat/completions` format, so it works with **any** provider —
OpenRouter (Claude/GPT/Gemini/Llama with one key), OpenAI, or local Ollama — chosen
by env vars (`AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`; see `.env.example`). The key
stays server-side; the widget hides itself when unconfigured. Answers are grounded in
the recalls/outbreaks the app has loaded, not free-form generation.

Dev is **one process**: `npm run dev` serves the app *and* the chat API (`/api/*`) via a
Vite plugin — no separate server needed. Configure a provider in `.env.local` and the chat
widget appears; leave it unset and the widget hides itself. Production is also one process:
`npm start` (build + serve the bundle on `PORT`) using the standalone Node server in `server/`.

## License

MIT — see [LICENSE](LICENSE).

## Integrity rule (important)

The named-locations feature is governed by one hard rule, enforced in
[`src/data/outbreaks.ts`](src/data/outbreaks.ts):

> A company appears **only** when an official FDA or CDC record names it — or
> names a branded product it sells. Risk is **never** inferred from supplier
> relationships, and being listed does **not** mean a location is currently unsafe.
> Every entry carries a citation link to its source.

This is deliberate: repeating unverified supply-chain links is how a supplier's
recall wrongly damaged a restaurant chain's reputation. When the FDA CORE table
or CDC page updates, update the numbers and citations in `outbreaks.ts`.

## Live outbreak feed (scraper + cron)

fda.gov sends no CORS headers, so the browser can't read the FDA CORE outbreak table
directly. Instead, [`scripts/scrape-outbreaks.mjs`](scripts/scrape-outbreaks.mjs) fetches
and parses that table server-side into `public/outbreaks.json`, which the client reads
same-origin. Run it manually with `npm run scrape`.

On the Pi it runs on a **cron every 6 hours**:

```cron
0 */6 * * * cd /path/to/opencore && /usr/bin/node scripts/scrape-outbreaks.mjs >> scrape.log 2>&1
```

The scraper only transcribes what the FDA table states (pathogen, product, case count,
status, source link). Deeper cited detail — named retailers, guidance, hospitalizations —
lives in [`src/data/outbreaks.ts`](src/data/outbreaks.ts) keyed by the FDA **reference
number** and merged onto the live rows. If the JSON is missing, the app falls back to the
curated outbreaks so nothing disappears.

## Stack

Vite + React + TypeScript, Tailwind + shadcn-style components, D3 for the charts.

## Data sources

- openFDA food enforcement API (recalls)
- FDA CORE Outbreak Investigation Table + CDC cyclosporiasis pages (curated spotlight)
- api.zippopotam.us (ZIP → centroid)
- Mapbox Search Box + GL JS (store / market locations and interactive map)

Not medical or official guidance. Always confirm against the linked FDA/CDC sources.
