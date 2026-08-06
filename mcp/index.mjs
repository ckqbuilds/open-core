#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchRecalls,
  listActiveOutbreaks,
  getOutbreakDetail,
  findFoodResources,
  fetchFsisRecalls,
  mapboxToken,
  CURATED,
} from "./data.mjs";
import { buildFoodIndex, foodById } from "./foods.mjs";

const server = new McpServer({ name: "opencore", version: "0.1.0" });

const json = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (msg) => ({ content: [{ type: "text", text: `Error: ${msg}` }], isError: true });

/** Active outbreaks with their curated named-supplier list attached (never inferred). */
async function activeOutbreaksWithNames() {
  const rows = await listActiveOutbreaks();
  return rows.map((o) => ({ ...o, named: CURATED[o.refId]?.named ?? [] }));
}

/**
 * Gather the three feeds the food tools group over: named active outbreaks,
 * relevant openFDA recalls, and FSIS recalls. A WAF block on FSIS degrades to an
 * empty FSIS list rather than failing the whole tool.
 */
async function foodIndexInputs() {
  const [outbreaks, fdaRecalls, fsisRecalls] = await Promise.all([
    activeOutbreaksWithNames(),
    searchRecalls({ agency: "FDA", limit: 100 }),
    fetchFsisRecalls().catch(() => []),
  ]);
  return { outbreaks, fdaRecalls, fsisRecalls };
}

server.registerTool(
  "list_active_outbreaks",
  {
    title: "List active FDA outbreaks",
    description:
      "List all active foodborne-illness outbreaks from the live FDA CORE investigation table (pathogen, product, case count, status, reference number).",
    inputSchema: {},
  },
  async () => {
    try {
      return json({ source: "FDA CORE Outbreak Investigation Table", outbreaks: await listActiveOutbreaks() });
    } catch (e) {
      return fail(e.message);
    }
  }
);

server.registerTool(
  "get_outbreak_detail",
  {
    title: "Get outbreak detail",
    description:
      "Get details for one outbreak by its FDA reference number (from list_active_outbreaks). Includes hand-verified, cited detail — named companies, hospitalizations, states — when available.",
    inputSchema: { refId: z.string().describe("FDA CORE reference number, e.g. \"1390\"") },
  },
  async ({ refId }) => {
    try {
      const d = await getOutbreakDetail(refId);
      return d ? json(d) : fail(`No outbreak found for reference #${refId}`);
    } catch (e) {
      return fail(e.message);
    }
  }
);

server.registerTool(
  "search_recalls",
  {
    title: "Search food recalls (FDA + FSIS)",
    description:
      "Search food recalls across openFDA (FDA-regulated food) AND USDA FSIS (meat, poultry, egg). Filter by keyword, severity class, status, and state. Results are limited to the last 3 years by default (override with `since`) so stale terminated recalls don't surface, and are merged and sorted newest-first. Each recall notes its `agency` (\"FDA\" or \"FSIS\"). Defaults to recent produce/meat/pathogen recalls.",
    inputSchema: {
      term: z.string().optional().describe("Keyword, e.g. \"lettuce\", \"beef\", or \"salmonella\""),
      classification: z.enum(["Class I", "Class II", "Class III"]).optional().describe("Severity: Class I = most serious"),
      status: z.enum(["Ongoing", "Completed", "Terminated"]).optional(),
      state: z.string().length(2).optional().describe("2-letter state code; also matches nationwide recalls"),
      agency: z.enum(["FDA", "FSIS"]).optional().describe("Scope to one feed; default is both"),
      since: z.string().regex(/^\d{8}$/).optional().describe("YYYYMMDD floor override (default: 3 years ago)"),
      limit: z.number().int().min(1).max(50).optional().default(20),
    },
  },
  async (args) => {
    try {
      return json({ recalls: await searchRecalls(args) });
    } catch (e) {
      return fail(e.message);
    }
  }
);

server.registerTool(
  "list_affected_foods",
  {
    title: "List affected foods",
    description:
      "Group the current record — active FDA outbreaks plus recent FDA + FSIS recalls — into broad food commodities (leafy greens, beef, eggs, …). Returns each food with its outbreak and recall counts and the pathogens implicated. Food categories are a display grouping of what the official feeds actually name; they are never a risk judgment or a supply-chain inference.",
    inputSchema: {},
  },
  async () => {
    try {
      const { outbreaks, fdaRecalls, fsisRecalls } = await foodIndexInputs();
      const index = buildFoodIndex(outbreaks, fdaRecalls, fsisRecalls);
      return json({
        note: "Grouping of official FDA/CDC/FSIS records by food commodity — not a risk ranking.",
        foods: index.map((e) => ({
          id: e.category.id,
          label: e.category.label,
          emoji: e.category.emoji,
          outbreakCount: e.outbreaks.length,
          recallCount: e.recallCount,
          fdaRecallCount: e.fdaRecalls.length,
          fsisRecallCount: e.fsisRecalls.length,
          pathogens: e.pathogens,
        })),
      });
    } catch (e) {
      return fail(e.message);
    }
  }
);

server.registerTool(
  "get_food",
  {
    title: "Get food detail",
    description:
      "Detail for one food commodity by its id (from list_affected_foods): the active outbreaks, FDA + FSIS recalls, implicated pathogens, and named suppliers. Named suppliers come only from the official curated record — never inferred from a food category.",
    inputSchema: {
      foodId: z.string().describe("Food category id, e.g. \"leafy-greens\", \"beef\", \"eggs\""),
    },
  },
  async ({ foodId }) => {
    try {
      const category = foodById(foodId);
      if (!category) return fail(`Unknown food id "${foodId}"`);
      const { outbreaks, fdaRecalls, fsisRecalls } = await foodIndexInputs();
      const entry = buildFoodIndex(outbreaks, fdaRecalls, fsisRecalls).find(
        (e) => e.category.id === foodId
      );
      return json({
        food: { id: category.id, label: category.label, emoji: category.emoji },
        outbreaks: entry?.outbreaks ?? [],
        fdaRecalls: entry?.fdaRecalls ?? [],
        fsisRecalls: entry?.fsisRecalls ?? [],
        pathogens: entry?.pathogens ?? [],
        namedSuppliers: entry?.namedEntities ?? [],
      });
    } catch (e) {
      return fail(e.message);
    }
  }
);

server.registerTool(
  "find_food_resources",
  {
    title: "Find local food resources",
    description:
      "Near a US ZIP code, find farmers markets plus locations of companies FDA/CDC named in the current cyclospora record (Walmart, Taco Bell). Requires a MAPBOX_TOKEN env var.",
    inputSchema: { zip: z.string().regex(/^\d{5}$/).describe("5-digit US ZIP code") },
  },
  async ({ zip }) => {
    try {
      return json(await findFoodResources(zip));
    } catch (e) {
      return fail(e.message);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
// Log to stderr (stdout is the MCP channel).
console.error(
  `opencore MCP server ready (location tools ${mapboxToken() ? "enabled" : "disabled — set MAPBOX_TOKEN"})`
);
