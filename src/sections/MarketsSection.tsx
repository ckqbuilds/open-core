import { Loader2, Sprout, Globe, Phone } from "lucide-react";
import { findMarketsNear } from "@/data/markets";
import { isMapsEnabled } from "@/data/mapbox";
import type { GeoZip, Market } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { Card, CardContent } from "@/components/ui/card";
import { MapViewLazy as MapView, type MapMarker } from "@/components/MapViewLazy";
import { EmptyState, InfoNote, MapsDisabledNote } from "@/components/common";

function formatPhone(digits: string): string {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

export function MarketsSection({ geo }: { geo: GeoZip | null }) {
  const mapsOn = isMapsEnabled();
  const markets = useAsync<Market[]>(
    (signal) => findMarketsNear(geo!, 25, signal),
    [geo?.zip],
    !!geo && mapsOn
  );

  if (!mapsOn) return <MapsDisabledNote />;
  if (!geo) {
    return <EmptyState>Enter your ZIP code above to find farmers markets near you.</EmptyState>;
  }

  const list = markets.data ?? [];
  const mapMarkers: MapMarker[] = list.map((m) => ({
    id: m.id,
    lat: m.lat ?? 0,
    lng: m.lng ?? 0,
    label: m.name,
    sublabel: m.address ?? `${(m.distanceMi ?? 0).toFixed(1)} mi away`,
    color: "#1baf7a", // aqua
  }));

  return (
    <div className="space-y-6">
      <InfoNote>
        Buying whole, local produce and washing it yourself lets you control handling and reduce
        exposure to recalled pre-packaged products. Markets below come from the USDA Local Food
        Directories within 25 miles of {geo.place}. Always confirm hours before visiting — call ahead.
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
          <Loader2 className="mr-2 size-4 animate-spin" /> Finding markets near {geo.place}…
        </div>
      )}

      {!markets.loading && !markets.error &&
        (list.length === 0 ? (
          <EmptyState>
            No farmers markets found within 25 miles. Try the{" "}
            <a
              className="text-primary hover:underline"
              href="https://www.usdalocalfoodportal.com/fe/fdirectory_farmersmarket/"
              target="_blank"
              rel="noreferrer"
            >
              USDA Local Food Directory
            </a>
            .
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.slice(0, 30).map((m) => (
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
        ))}
    </div>
  );
}
