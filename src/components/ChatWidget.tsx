import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadOutbreaks } from "@/data/outbreaksLive";
import { buildContext, chatStatus, streamChat, type ChatMessage } from "@/data/chat";
import { MarkdownMessage, parseAssistant } from "@/components/MarkdownMessage";
import { useZipContext } from "@/hooks/ZipContext";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "What's the cyclospora outbreak, in plain English?",
  "Which recalls near me are the most serious?",
  "Is it safe to eat eggs right now?",
  "How do I avoid getting sick from lettuce?",
];

/** Unobtrusive bottom-right popover (default) vs a large centered panel (maximized). */
const DEFAULT_PANEL =
  "fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden border bg-card shadow-2xl h-[80vh] rounded-t-xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[560px] sm:w-[380px] sm:rounded-xl";
const EXPANDED_PANEL =
  "fixed inset-2 z-50 flex flex-col overflow-hidden border bg-card shadow-2xl rounded-xl sm:inset-y-8 sm:left-1/2 sm:right-auto sm:w-[min(760px,92vw)] sm:-translate-x-1/2";

export function ChatWidget() {
  const { geo } = useZipContext();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState("");
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatStatus().then((s) => setEnabled(s.enabled));
  }, []);

  // Build grounding context the first time the panel opens (and when ZIP changes).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [live, recalls] = await Promise.all([
          loadOutbreaks(),
          fetchRelevantRecalls(120),
        ]);
        if (!cancelled) {
          contextRef.current = buildContext({ geo, outbreaks: live.outbreaks, recalls });
        }
      } catch {
        if (!cancelled) contextRef.current = geo ? `User is near ${geo.place}, ${geo.stateAbbr}.` : "";
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, geo?.zip]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  if (enabled === false) return null; // chat not configured — hide entirely

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);
    setThinking("");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(
        next,
        contextRef.current,
        {
          onToken: (token) => {
            setThinking("");
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: last.content + token };
              return copy;
            });
          },
          // Reasoning models stream thinking first — show it so the UI isn't frozen.
          onReasoning: (r) => setThinking((prev) => (prev + r).slice(-280)),
        },
        controller.signal
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setMessages((prev) => prev.slice(0, -1)); // drop the empty assistant bubble
      }
    } finally {
      setStreaming(false);
      setThinking("");
      abortRef.current = null;
    }
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
          aria-label="Ask about recalls and outbreaks"
        >
          <MessageCircle className="size-5" />
          <span className="hidden sm:inline">Ask about this</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <>
          {expanded && (
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              aria-hidden
              onClick={() => setExpanded(false)}
            />
          )}
          <div className={expanded ? EXPANDED_PANEL : DEFAULT_PANEL}>
            <div className="flex items-center justify-between border-b bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm font-semibold">Ask about recalls &amp; outbreaks</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                aria-label={expanded ? "Restore chat size" : "Maximize chat"}
              >
                {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setExpanded(false);
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Close chat"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  I explain the recalls and outbreaks in this dashboard in plain language, grounded
                  in the FDA/CDC data{geo ? ` near ${geo.place}` : ""}. Try:
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border px-3 py-2 text-left text-sm hover:border-primary/50 hover:bg-secondary/50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                if (m.role === "user") {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                const { body, followups } = parseAssistant(m.content);
                return (
                  <div key={i} className="flex flex-col items-start gap-2">
                    <div className="max-w-[85%] rounded-2xl bg-secondary px-3 py-2 text-secondary-foreground">
                      {m.content ? (
                        <MarkdownMessage>{body}</MarkdownMessage>
                      ) : streaming && isLast ? (
                        <span className="flex flex-col gap-1">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" /> Thinking…
                          </span>
                          {thinking && (
                            <span className="line-clamp-2 text-xs italic text-muted-foreground/70">
                              {thinking}
                            </span>
                          )}
                        </span>
                      ) : null}
                    </div>
                    {followups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {followups.map((f) => (
                          <button
                            key={f}
                            onClick={() => send(f)}
                            disabled={streaming}
                            className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask a question…"
                className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
                {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
            <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground">
              AI can be wrong. Confirm against the linked FDA/CDC sources. Not medical advice.
            </p>
          </div>
          </div>
          </>
      )}
    </>
  );
}
