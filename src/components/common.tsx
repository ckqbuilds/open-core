import { ExternalLink } from "lucide-react";
import type { SourceCitation } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";

/** A citation link — every claim about a named entity must carry one. */
export function SourceLink({ source }: { source: SourceCitation }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <ExternalLink className="size-3" />
      {source.agency} source ({source.date})
    </a>
  );
}

/** A KPI stat tile — hero number, label, optional caption. */
export function StatTile({
  value,
  label,
  caption,
  tone = "default",
}: {
  value: string | number;
  label: string;
  caption?: string;
  tone?: "default" | "critical" | "warning";
}) {
  const color =
    tone === "critical"
      ? "text-[var(--status-critical)]"
      : tone === "warning"
        ? "text-[color:var(--viz-ink)]"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</div>
        <div className="mt-0.5 text-sm font-medium">{label}</div>
        {caption && <div className="mt-1 text-xs text-muted-foreground">{caption}</div>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="p-4 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

/** Shown when location features are used but no Mapbox token is configured. */
export function MapsDisabledNote() {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-2 p-6 text-sm">
        <div className="font-medium text-foreground">Location features need a Mapbox token</div>
        <p className="text-muted-foreground">
          This section uses Mapbox to search nearby locations and render the map. Add a URL-restricted
          public token to enable it:
        </p>
        <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
          <li>
            Create a token at{" "}
            <a
              className="text-primary hover:underline"
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noreferrer"
            >
              account.mapbox.com
            </a>{" "}
            and restrict it to your domain + <code>http://localhost:5173</code>.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and set{" "}
            <code>VITE_MAPBOX_TOKEN=pk.…</code>
          </li>
          <li>Restart <code>npm run dev</code>.</li>
        </ol>
      </CardContent>
    </Card>
  );
}
