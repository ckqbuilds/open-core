import { Card } from "@heroui/react";
import { RecordLine } from "@/components/RecordLine";
import type { SourceCitation } from "@/data/types";
import { formatIso } from "@/lib/utils";

/** A citation link — every claim about a named entity must carry one. */
export function SourceLink({ source }: { source: SourceCitation }) {
  return <RecordLine agency={`${source.agency} source`} url={source.url} date={formatIso(source.date)} />;
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
    <Card className="border border-accent/30 bg-accent/5">
      <Card.Content className="text-sm text-muted-foreground">{children}</Card.Content>
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
export function MapsDisabledNote({ page = "default" }: { page?: "default" | "shop-local" }) {
  return (
    <Card className="border border-dashed p-6">
      <Card.Content className="space-y-2 text-sm">
        <div className="font-medium text-foreground">
          {page === "shop-local"
            ? "Maps aren't available right now. The list still works from your ZIP."
            : "Maps and location search aren't available right now"}
        </div>
        <p className="max-w-prose text-muted-foreground">
          {page === "shop-local"
            ? "To browse local food sources yourself, try the"
            : "The recalls and the companies named in the official record are still listed on each food and outbreak page. To find local food sources near you, try the"}{" "}
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
      </Card.Content>
    </Card>
  );
}
