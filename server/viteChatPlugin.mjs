import { isChatConfigured, providerConfig, streamChat } from "./chat.mjs";

/**
 * Vite dev plugin: serves /api/chat and /api/chat/status inside the Vite dev
 * server, so `npm run dev` alone runs the whole app — no separate chat server,
 * no proxy, no 500 when the second process isn't up. Production still uses the
 * standalone Express server (server/index.mjs).
 *
 * Reads AI_* from process.env, which vite.config populates from .env.local via
 * loadEnv.
 */
export function chatDevPlugin() {
  return {
    name: "chat-dev-server",
    configureServer(server) {
      // Register status FIRST so it wins the prefix match over /api/chat.
      server.middlewares.use("/api/chat/status", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ enabled: isChatConfigured(), model: providerConfig().model || null }));
      });

      server.middlewares.use("/api/chat", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        if (!isChatConfigured()) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "chat_disabled", message: "Set AI_BASE_URL and AI_MODEL" }));
          return;
        }

        let raw = "";
        for await (const chunk of req) raw += chunk;
        let body;
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          res.statusCode = 400;
          res.end('{"error":"bad_json"}');
          return;
        }
        const { messages, context } = body;
        if (!Array.isArray(messages) || messages.length === 0) {
          res.statusCode = 400;
          res.end('{"error":"bad_request","message":"messages[] required"}');
          return;
        }

        const controller = new AbortController();
        req.on("close", () => controller.abort());
        try {
          const upstream = await streamChat({ messages, context }, controller.signal);
          if (!upstream.ok || !upstream.body) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "provider_error", status: upstream.status }));
            return;
          }
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
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
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "server_error", message: String(err?.message ?? err) }));
          } else {
            res.end();
          }
        }
      });
    },
  };
}
