# opencore-mcp

An MCP (Model Context Protocol) server that exposes live FDA/CDC food-safety
data as tools, so you can ask any MCP-compatible AI client (Claude Desktop,
etc.) about recalls, active outbreaks, and local food resources.

## Tools

| Tool | What it does |
|---|---|
| `list_active_outbreaks` | All active outbreaks from the live FDA CORE table (pathogen, product, case count, status, ref #). |
| `get_outbreak_detail` | Detail for one outbreak by FDA reference number, incl. hand-verified named companies + citations where available. |
| `search_recalls` | Search openFDA recalls by keyword, severity class, status, and state. |
| `find_food_resources` | Farmers markets + FDA/CDC-named store locations near a ZIP. Needs `MAPBOX_TOKEN`. |

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

openFDA food enforcement API · FDA CORE Outbreak Investigation Table · CDC
cyclosporiasis pages · api.zippopotam.us · Mapbox Search Box. Same integrity
rule as the dashboard: only companies FDA/CDC actually named appear, each with a
source — never inferred from supply chains. Not medical advice.
