import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Split an assistant reply into its markdown body and an optional list of
 * follow-up suggestions. The model is told (in the system prompt) it may end a
 * reply with a "Follow-ups:" section listing 2–4 short next questions; we parse
 * those out and render them as tappable chips.
 */
export function parseAssistant(content: string): { body: string; followups: string[] } {
  const marker = /(^|\n)[ \t>*_#-]*follow[\s_-]?ups?\s*:?[ \t]*(\n|$)/i;
  const m = marker.exec(content);
  if (!m || m.index === undefined) return { body: content, followups: [] };

  const body = content.slice(0, m.index).trimEnd();
  const rest = content.slice(m.index + m[0].length);
  const followups = rest
    .split("\n")
    .map((l) => l.replace(/^[\s>*_#\-•\d.)\]]+/, "").replace(/[\[\]]/g, "").trim())
    .filter((l) => l.length > 1 && l.length <= 120)
    .slice(0, 4);

  // If the "Follow-ups:" line had no parseable items yet (still streaming),
  // keep the whole thing as body so nothing disappears mid-stream.
  return followups.length ? { body, followups } : { body: content, followups: [] };
}

/** Render assistant markdown (bold, italics, lists, links, code) safely. */
export function MarkdownMessage({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_p]:m-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: (props) => <strong className="font-bold" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="link"
            />
          ),
          ul: (props) => <ul className="my-1 list-disc space-y-1 pl-5" {...props} />,
          ol: (props) => <ol className="my-1 list-decimal space-y-1 pl-5" {...props} />,
          li: (props) => <li className="marker:text-ink-2" {...props} />,
          h1: (props) => <h3 className="mt-2 text-sm font-bold" {...props} />,
          h2: (props) => <h3 className="mt-2 text-sm font-bold" {...props} />,
          h3: (props) => <h3 className="mt-2 text-sm font-bold" {...props} />,
          h4: (props) => <h4 className="mt-2 text-sm font-bold" {...props} />,
          code: ({ className, children, ...props }) => {
            const isBlock = /\n/.test(String(children)) || (className ?? "").includes("language-");
            return isBlock ? (
              <code
                className="block overflow-x-auto rounded-md bg-ground p-2 font-mono text-xs"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className="rounded bg-ground px-1 py-0.5 font-mono text-[0.8em]" {...props}>
                {children}
              </code>
            );
          },
          pre: (props) => <pre className="my-1" {...props} />,
          blockquote: (props) => (
            <blockquote className="border-l-2 border-rule pl-3 text-ink-2" {...props} />
          ),
          hr: () => <hr className="my-2 border-rule" />,
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="my-1 w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => <th className="border border-rule px-2 py-1 text-left font-medium" {...props} />,
          td: (props) => <td className="border border-rule px-2 py-1" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
