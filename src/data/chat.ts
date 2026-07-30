import type { GeoZip, Outbreak, Recall } from "./types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Is the server-side chat provider configured? */
export async function chatStatus(): Promise<{ enabled: boolean; model: string | null }> {
  try {
    const res = await fetch("/api/chat/status");
    if (!res.ok) return { enabled: false, model: null };
    return await res.json();
  } catch {
    return { enabled: false, model: null };
  }
}

/**
 * Build a compact, grounded context string from the user's current view so the
 * model answers from real data instead of guessing.
 */
export function buildContext(input: {
  geo: GeoZip | null;
  outbreaks: Outbreak[];
  recalls: Recall[];
}): string {
  const { geo, outbreaks, recalls } = input;
  const lines: string[] = [];

  lines.push(
    geo
      ? `User location: ${geo.place}, ${geo.stateAbbr} (ZIP ${geo.zip}).`
      : "User has not entered a ZIP code yet."
  );

  const active = outbreaks.filter((o) => o.status === "active");
  lines.push(`\nActive FDA/CDC outbreaks (${active.length}):`);
  for (const o of active.slice(0, 20)) {
    const cases = o.caseCount != null ? `${o.caseCount} cases` : o.caseCountText ?? "case count via advisory";
    const named = o.namedEntities?.length
      ? ` Named in record: ${o.namedEntities.map((e) => e.name).join(", ")}.`
      : "";
    lines.push(
      `- ${o.pathogen}${o.vehicle && o.vehicle !== "Not yet identified" ? ` linked to ${o.vehicle}` : ""}: ${cases}` +
        `${o.statesAffectedCount != null ? `, ${o.statesAffectedCount} states` : ""}, ${o.eventStatus ?? "Ongoing"}.` +
        named
    );
  }

  const relevant = geo
    ? recalls.filter((r) => r.nationwide || r.distributionStates.includes(geo.stateAbbr))
    : recalls;
  lines.push(`\nRecent recalls relevant to the user (${relevant.length} shown of ${recalls.length}):`);
  for (const r of relevant.slice(0, 15)) {
    lines.push(
      `- [${r.classification}, ${r.status}] ${r.productDescription.slice(0, 90)} — ${r.reason.slice(0, 90)} ` +
        `(firm: ${r.recallingFirm}; ${r.nationwide ? "nationwide" : r.distributionStates.join("/") || "regional"})`
    );
  }

  return lines.join("\n");
}

export interface StreamHandlers {
  /** Final answer tokens. */
  onToken: (text: string) => void;
  /** Reasoning/thinking tokens (reasoning models like Qwen3, DeepSeek-R1).
   *  Streamed before the answer — use it to show live progress. */
  onReasoning?: (text: string) => void;
}

/**
 * POST to the server chat proxy and stream the reply. Parses the
 * OpenAI-compatible SSE the server pipes through, handling both `content`
 * (the answer) and `reasoning_content` (thinking, emitted first by reasoning
 * models — otherwise the UI looks frozen while the model thinks).
 */
export async function streamChat(
  messages: ChatMessage[],
  context: string,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
    signal,
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta;
        if (!delta) continue;
        // reasoning_content (OpenAI-ish) or reasoning (some providers)
        const reasoning = delta.reasoning_content ?? delta.reasoning;
        if (typeof reasoning === "string" && reasoning) handlers.onReasoning?.(reasoning);
        if (typeof delta.content === "string" && delta.content) handlers.onToken(delta.content);
      } catch {
        // partial JSON across chunks — ignore; next chunk completes it
      }
    }
  }
}
