import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sprout, Globe, Phone, RefreshCw, MapPin } from "lucide-react";
import { findAllMarketsNear, DIRECTORIES, type MergedMarket } from "@/data/markets";
import type { GeoZip } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useZipContext } from "@/hooks/ZipContext";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function formatPhone(digits: string): string {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

/** Small shared shell so every state keeps the same "spotlight" footprint. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-accent/40 bg-accent/5 shadow-md ring-1 ring-accent/10">
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function Eyebrow() {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
      <Sprout className="size-3.5" />
      Featured near you
    </div>
  );
}

/** First-run content: what a ZIP unlocks, with an input bound to the shared ZIP value. */
function FirstRun() {
  const { zip, setZip, geoLoading, geoError } = useZipContext();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">
          Add your ZIP to see which recalls reach your state, the named store locations near you,
          and local food sources
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your ZIP stays in this browser. It is only used to look up your location.
        </p>
      </div>
      <div className="shrink-0">
        <label htmlFor="home-zip" className="sr-only">
          Your ZIP code
        </label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="home-zip"
            inputMode="numeric"
            maxLength={5}
            placeholder="ZIP code"
            autoComplete="postal-code"
            aria-invalid={geoError ? true : undefined}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className={cn(
              "h-10 w-full rounded-md border bg-background pl-8 pr-8 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-40 sm:text-sm",
              geoError ? "border-destructive" : "border-input"
            )}
          />
          {geoLoading && (
            <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <p role="status" aria-live="polite" className="mt-1 min-h-4 text-xs text-destructive">
          {geoError}
        </p>
      </div>
    </div>
  );
}

/**
 * A positive nudge on the home page: spotlight ONE randomly chosen local food
 * source near the user's ZIP. Works without Mapbox (USDA proxy + ZIP geocoding);
 * every failure mode degrades to a quiet, honest card rather than crashing.
 */
export function FeaturedLocal({ geo }: { geo: GeoZip | null }) {
  const markets = useAsync<MergedMarket[]>(
    (signal) => findAllMarketsNear(geo!, 30, signal),
    [geo?.zip],
    !!geo
  );

  const list = markets.data ?? [];
  const [index, setIndex] = useState(0);

  // Pick a fresh random spotlight whenever the data (or ZIP) changes.
  useEffect(() => {
    if (list.length > 0) setIndex(Math.floor(Math.random() * list.length));
  }, [markets.data, geo?.zip]);

  // Re-pick a *different* market; no-op when there's nothing else to show.
  function showAnother() {
    if (list.length <= 1) return;
    let next = index;
    while (next === index) next = Math.floor(Math.random() * list.length);
    setIndex(next);
  }

  // No ZIP yet → first-run row: say what a ZIP unlocks and take it right here.
  if (!geo) {
    return (
      <Frame>
        <FirstRun />
      </Frame>
    );
  }

  if (markets.loading) {
    return (
      <Frame>
        <Eyebrow />
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Finding a local spot near {geo.place}…
        </div>
      </Frame>
    );
  }

  // Errors and true emptiness both resolve to a quiet, honest fallback.
  if (markets.error || list.length === 0) {
    return (
      <Frame>
        <Eyebrow />
        <p className="mt-2 text-sm text-muted-foreground">
          No local food sources to feature near {geo.place} right now.{" "}
          <Link className="font-medium text-primary hover:underline" to="/shop-local">
            Browse Shop local →
          </Link>
        </p>
      </Frame>
    );
  }

  const m = list[Math.min(index, list.length - 1)];

  return (
    <Frame>
      <div className="flex items-start justify-between gap-3">
        <Eyebrow />
        {list.length > 1 && (
          <button
            type="button"
            onClick={showAnother}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-3" /> Show another
          </button>
        )}
      </div>

      <h3 className="mt-2 text-xl font-semibold tracking-tight">{m.name}</h3>

      <div className="mt-2 flex flex-wrap gap-1">
        {m.directories.map((id) => {
          const d = DIRECTORIES.find((x) => x.id === id);
          if (!d) return null;
          return (
            <Badge key={id} variant="secondary">
              {d.emoji} {d.label}
            </Badge>
          );
        })}
      </div>

      <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-1 tabular-nums">
          <MapPin className="size-3.5 shrink-0" />
          {(m.distanceMi ?? 0).toFixed(1)} mi away
        </div>
        {m.address && <div className="text-xs">{m.address}</div>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <a
          className="font-medium text-primary hover:underline"
          href={`https://maps.apple.com/?ll=${m.lat},${m.lng}&q=${encodeURIComponent(m.name)}`}
          target="_blank"
          rel="noreferrer"
        >
          Map
        </a>
        {m.phone && (
          <a
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            href={`tel:+1${m.phone}`}
          >
            <Phone className="size-3.5" />
            {formatPhone(m.phone)}
          </a>
        )}
        {m.website && (
          <a
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            href={m.website}
            target="_blank"
            rel="noreferrer"
          >
            <Globe className="size-3.5" /> Website
          </a>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Buying whole and local lets you control handling and sidestep recalled packaged products.
      </p>

      <div className="mt-3">
        <Link className="text-sm font-medium text-primary hover:underline" to="/shop-local">
          See all local spots →
        </Link>
      </div>
    </Frame>
  );
}
