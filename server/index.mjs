import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { isChatConfigured, providerConfig, streamChat } from "./chat.mjs";
import { fetchUsdaMarkets, isMarketsConfigured } from "./markets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);

const app = express();
app.use(express.json({ limit: "256kb" }));

// Capability probe so the client can hide the chat UI when unconfigured.
app.get("/api/chat/status", (_req, res) => {
  res.json({ enabled: isChatConfigured(), model: providerConfig().model || null });
});

// USDA farmers markets near a lat/lng. Key stays server-side.
app.get("/api/markets", async (req, res) => {
  if (!isMarketsConfigured()) {
    res.status(503).json({ error: "markets_disabled", message: "Set USDA_API_KEY" });
    return;
  }
  const { x, y, radius, directory } = req.query;
  if (x == null || y == null) {
    res.status(400).json({ error: "bad_request", message: "x and y required" });
    return;
  }
  const controller = new AbortController();
  req.on("close", () => controller.abort());
  try {
    const markets = await fetchUsdaMarkets(
      { x, y, radius: radius ? Number(radius) : 25, directory },
      controller.signal
    );
    res.json({ markets });
  } catch (err) {
    if (controller.signal.aborted) return;
    res.status(502).json({ error: "usda_error", message: String(err?.message ?? err) });
  }
});

// Provider-agnostic streaming chat proxy. Secret key stays here, never shipped.
app.post("/api/chat", async (req, res) => {
  if (!isChatConfigured()) {
    res.status(503).json({ error: "chat_disabled", message: "Set AI_BASE_URL and AI_MODEL" });
    return;
  }
  const { messages, context } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "bad_request", message: "messages[] required" });
    return;
  }

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const upstream = await streamChat({ messages, context }, controller.signal);
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      res.status(502).json({ error: "provider_error", status: upstream.status, detail: detail.slice(0, 500) });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    // Pipe the provider's OpenAI-style SSE straight through to the browser.
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    if (controller.signal.aborted) return;
    if (!res.headersSent) {
      res.status(500).json({ error: "server_error", message: String(err?.message ?? err) });
    } else {
      res.end();
    }
  }
});

// Serve the built SPA (production single-process). In dev, Vite serves the app
// and proxies /api here.
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get("*", (_req, res) => res.sendFile(join(DIST, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  const cfg = providerConfig();
  console.log(`OpenCORE server on http://0.0.0.0:${PORT}`);
  console.log(`Chat: ${isChatConfigured() ? `enabled (model: ${cfg.model})` : "disabled — set AI_BASE_URL + AI_MODEL"}`);
  console.log(existsSync(DIST) ? "Serving built app from dist/" : "No dist/ — run `npm run build` (dev uses Vite)");
});
