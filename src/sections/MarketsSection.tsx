import { useEffect, useState } from "react";
import { Loader2, Sprout, Globe, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { findMarketsNear, DIRECTORIES, DEFAULT_DIRECTORY } from "@/data/markets";
import { isMapsEnabled } from "@/data/mapbox";
import type { GeoZip, Market, UsdaDirectory } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MapViewLazy as MapView, type MapMarker } from "@/components/MapViewLazy";
import { EmptyState, InfoNote, MapsDisabledNote } from "@/components/common";

function formatPhone(digits: string): string {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

const PAGE_SIZES = [10, 20, 40, 50];

export function MarketsSection({ geo }: { geo: GeoZip | null }) {
  const mapsOn = isMapsEnabled();
  const [directory, setDirectory] = useState<UsdaDirectory>(DEFAULT_DIRECTORY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const info = DIRECTORIES.find((d) => d.id === directory) ?? DIRECTORIES[0];
  const markets = useAsync<Market[]>(
    (signal) => findMarketsNear(geo!, 25, signal, directory),
    [geo?.zip, directory],
    !!geo && mapsOn
  );

  // Back to page 1 whenever the result set or page size changes.
  useEffect(() => setPage(1), [directory, geo?.zip, pageSize]);

  if (!mapsOn) return <MapsDisabledNote />;
  if (!geo) {
    return (
      <EmptyState>Enter your ZIP code above to find local food sources near you.</EmptyState>
    );
  }

  const list = markets.data ?? [];
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageItems = list.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
  // Map shows every result; only the tiles below paginate.
  const mapMarkers: MapMarker[] = list.map((m) => ({
    id: m.id,
    lat: m.lat ?? 0,
    lng: m.lng ?? 0,
    label: m.name,
    sublabel: m.address ?? `${(m.distanceMi ?? 0).toFixed(1)} mi away`,
    color: "#1baf7a", // aqua
    address: m.address,
    distanceMi: m.distanceMi,
    phone: m.phone,
    website: m.website,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Directory type">
        {DIRECTORIES.map((d) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.id === directory}
            onClick={() => setDirectory(d.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              d.id === directory
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <InfoNote>
        Buying whole, local produce and washing it yourself lets you control handling and reduce
        exposure to recalled pre-packaged products. Listings below come from the USDA Local Food
        Directories ({info.label.toLowerCase()}) within 25 miles of {geo.place}. Always confirm hours
        before visiting — call ahead.
      </InfoNote>

      {markets.error && (
        <EmptyState>
          Couldn't load markets ({String(markets.error)}).{" "}
          <button className="text-primary hover:underline" onClick={markets.reload}>
            Retry
          </button>
        </EmptyState>
      )}

      {!markets.loading && !markets.error && (
        <MapView markers={mapMarkers} center={{ lat: geo.lat, lng: geo.lng }} />
      )}

      {markets.loading && (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Finding {info.label.toLowerCase()} near{" "}
          {geo.place}…
        </div>
      )}

      {!markets.loading && !markets.error &&
        (list.length === 0 ? (
          <EmptyState>
            No {info.label.toLowerCase()} found within 25 miles. Try the{" "}
            <a
              className="text-primary hover:underline"
              href={`https://www.usdalocalfoodportal.com/fe/fdirectory_${directory}/`}
              target="_blank"
              rel="noreferrer"
            >
              USDA Local Food Directory
            </a>
            .
          </EmptyState>
        ) : (
          <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="tabular-nums">
              {list.length} {info.label.toLowerCase()} found
            </span>
            <label className="flex items-center gap-2">
              Per page
              <select
                className="rounded-md border bg-background px-2 py-1 text-foreground"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pageItems.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Sprout className="mt-0.5 size-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{m.name}</div>
                      {m.address && (
                        <div className="text-xs text-muted-foreground">{m.address}</div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="tabular-nums text-muted-foreground">
                          {(m.distanceMi ?? 0).toFixed(1)} mi
                        </span>
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
                            <Phone className="size-3" />
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
                            <Globe className="size-3" /> Website
                          </a>
                        )}
                      </div>
                      {m.updatedAt && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          USDA listing updated {m.updatedAt}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-muted-foreground enabled:hover:text-foreground disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={clampedPage <= 1}
              >
                <ChevronLeft className="size-4" /> Prev
              </button>
              <span className="tabular-nums text-muted-foreground">
                Page {clampedPage} of {pageCount}
              </span>
              <button
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-muted-foreground enabled:hover:text-foreground disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={clampedPage >= pageCount}
              >
                Next <ChevronRight className="size-4" />
              </button>
            </div>
          )}
          </div>
        ))}
    </div>
  );
}
