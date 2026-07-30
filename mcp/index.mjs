#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchRecalls,
  listActiveOutbreaks,
  getOutbreakDetail,
  findFoodResources,
  mapboxToken,
} from "./data.mjs";

const server = new McpServer({ name: "opencore", version: "0.1.0" });

const json = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (msg) => ({ content: [{ type: "text", text: `Error: ${msg}` }], isError: true });

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
    title: "Search FDA food recalls",
    description:
      "Search the openFDA food enforcement (recall) database. Filter by keyword, severity class, status, and state. Defaults to recent produce/pathogen recalls.",
    inputSchema: {
      term: z.string().optional().describe("Keyword, e.g. \"lettuce\" or \"salmonella\""),
      classification: z.enum(["Class I", "Class II", "Class III"]).optional().describe("Severity: Class I = most serious"),
      status: z.enum(["Ongoing", "Completed", "Terminated"]).optional(),
      state: z.string().length(2).optional().describe("2-letter state code; also matches nationwide recalls"),
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
