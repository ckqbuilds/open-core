/**
 * Provider-agnostic chat backend.
 *
 * Uses the OpenAI-compatible /chat/completions wire format, which is spoken by
 * OpenRouter (fronts Claude, GPT, Gemini, Llama, …), OpenAI, Ollama, LM Studio,
 * Together, Groq, Mistral, DeepSeek, and more. The provider is chosen entirely
 * by env vars — the app is not tied to any single vendor:
 *
 *   AI_BASE_URL   e.g. https://openrouter.ai/api/v1  |  http://localhost:11434/v1
 *   AI_API_KEY    provider key (omit for local Ollama)
 *   AI_MODEL      e.g. anthropic/claude-opus-4-8  |  gpt-4o-mini  |  llama3.1
 *
 * The secret key stays server-side; the browser never sees it.
 */

const SYSTEM_PROMPT = `You are the assistant inside "OpenCORE", a public food-safety dashboard.
Your job is to explain active FDA/CDC food recalls and outbreaks, and the stores/farmers-markets
near the user, in plain, calm, everyday language a worried non-expert can act on.

Rules:
- Ground every answer in the CONTEXT the app provides below. If the context doesn't cover
  something, say so plainly and point the user to the FDA/CDC source links in the app — do not
  invent case numbers, brands, dates, or store locations.
- Explain the recall severity classes when relevant: Class I = most serious (can cause serious
  harm or death), Class II = moderate/reversible, Class III = least serious (usually labeling).
- Never tell someone a specific store is "unsafe." The app only lists companies FDA or CDC
  actually named. Being named means it's part of an investigation, not that a location is dangerous.
- Be concise and practical. Lead with what to do. Use short paragraphs or tight bullet lists.
- You are not a doctor. For symptoms or medical questions, tell the user to contact a healthcare
  provider or call their local health department.

Formatting: reply in GitHub-flavored Markdown. Use **bold** for the key thing to do,
*italics* sparingly for emphasis, and "-" bullet lists for steps or options. Keep it short.

When helpful, END your reply with a follow-up section — the literal line "Follow-ups:" on its
own, then 2–4 short suggested next questions the user might tap, one per "-" bullet. Phrase each
as a question the user would ask you (e.g. "- Is the egg recall serious?"). Only include it when
there are genuinely useful next questions; otherwise omit it.`;

export function providerConfig() {
  return {
    baseUrl: (process.env.AI_BASE_URL || "").replace(/\/$/, ""),
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "",
  };
}

export function isChatConfigured() {
  const { baseUrl, model } = providerConfig();
  return Boolean(baseUrl && model);
}

/**
 * Stream a chat completion from the configured provider. Returns the upstream
 * fetch Response so the caller can pipe its SSE body straight to the browser.
 */
export async function streamChat({ messages, context }, signal) {
  const { baseUrl, apiKey, model } = providerConfig();
  if (!baseUrl || !model) {
    throw new Error("Chat not configured — set AI_BASE_URL and AI_MODEL");
  }

  // Single system message at position 0 — many local model chat templates
  // (Qwen3, etc.) reject a second system message ("System message must be at
  // the beginning") or more than one.
  const system =
    `${SYSTEM_PROMPT}\n\nCONTEXT (the user's current view of the app):\n` +
    (context || "No app context was provided.");
  const upstreamMessages = [
    { role: "system", content: system },
    ...messages
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  // OpenRouter asks for these; harmless elsewhere.
  headers["HTTP-Referer"] = "https://opencore.local";
  headers["X-Title"] = "OpenCORE";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages: upstreamMessages, stream: true, temperature: 0.3 }),
    signal,
  });
  return res;
}
