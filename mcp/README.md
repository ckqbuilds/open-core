# opencore-mcp

An MCP (Model Context Protocol) server that exposes live FDA/CDC food-safety
data as tools, so you can ask any MCP-compatible AI client (Claude Desktop,
etc.) about recalls, active outbreaks, and local food resources.

## Tools

| Tool | What it does |
|---|---|
| `list_active_outbreaks` | All active outbreaks from the live FDA CORE table (pathogen, product, case count, status, ref #). |
| `get_outbreak_detail` | Detail for one outbreak by FDA reference number, incl. hand-verified named companies + citations where available. |
| `search_recalls` | Search recalls across **openFDA (FDA-regulated food) and USDA FSIS (meat/poultry/egg)** by keyword, severity class, status, and state. Limited to the **last 3 years** by default (override with `since`); each result notes its `agency`. Use `agency` to scope to one feed. |
| `list_affected_foods` | Group active outbreaks + recent FDA & FSIS recalls into food commodities (leafy greens, beef, eggs, …) with outbreak/recall counts and implicated pathogens. |
| `get_food` | Detail for one food commodity by id: its outbreaks, FDA + FSIS recalls, pathogens, and named suppliers (from the curated record). |
| `find_food_resources` | Farmers markets + FDA/CDC-named store locations near a ZIP. Needs `MAPBOX_TOKEN`. |

Food categories are a **display grouping** of what the official feeds actually name — never a
risk judgment and never a supply-chain inference. The 3-year recency floor keeps stale,
long-terminated recalls from surfacing under current concerns.

## Run it

```bash
# from anywhere, once published:
npx opencore-mcp

# or locally from this folder:
cd mcp && npm install && node index.mjs
```

The server speaks MCP over **stdio** — it's meant to be launched by an MCP client, not run interactively.

## Add to Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`,
Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "opencore": {
      "command": "npx",
      "args": ["-y", "opencore-mcp"],
      "env": {
        "MAPBOX_TOKEN": "pk.your_token_here"
      }
    }
  }
}
```

Restart Claude Desktop. `MAPBOX_TOKEN` is optional — omit it and the three data
tools still work; only `find_food_resources` (location lookups) needs it.

To run from a local checkout instead of npx:

```json
{
  "mcpServers": {
    "opencore": {
      "command": "node",
      "args": ["/absolute/path/to/opencore/mcp/index.mjs"],
      "env": { "MAPBOX_TOKEN": "pk.your_token_here" }
    }
  }
}
```

## Data sources

openFDA food enforcement API · USDA FSIS Recalls & Public Health Alerts API ·
FDA CORE Outbreak Investigation Table · CDC cyclosporiasis pages ·
api.zippopotam.us · Mapbox Search Box. Same integrity rule as the dashboard:
only companies FDA/CDC actually named appear, each with a source — never inferred
from supply chains or from a food category. Not medical advice.
