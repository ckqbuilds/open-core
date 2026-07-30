import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
// @ts-expect-error — plain .mjs server module, no type declarations
import { chatDevPlugin } from "./server/viteChatPlugin.mjs";

export default defineConfig(({ mode }) => {
  // Load .env.local (and .env) — empty prefix loads AI_* (not just VITE_*) so
  // the dev chat middleware can read the provider config.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  return {
    plugins: [react(), chatDevPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
