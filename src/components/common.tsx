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

/**
 * Shown when location features are used but no Mapbox token is configured.
 *
 * Developer setup (not shown to the public):
 *  1. Create a public token at https://account.mapbox.com/access-tokens/ and
 *     URL-restrict it to your domain + http://localhost:5173.
 *  2. Copy .env.example to .env.local and set VITE_MAPBOX_TOKEN=pk.…
 *  3. Restart `npm run dev`.
 */
export function MapsDisabledNote() {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-2 p-6 text-sm">
        <div className="font-medium text-foreground">Maps and location search aren't available right now</div>
        <p className="text-muted-foreground">
          The companies and recalls named in the official record still show above. To find local food
          sources near you, try the{" "}
          <a
            className="text-primary hover:underline"
            href="https://www.usdalocalfoodportal.com/"
            target="_blank"
            rel="noreferrer"
          >
            USDA Local Food Directories
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
