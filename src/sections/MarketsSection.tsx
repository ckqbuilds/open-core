import { Loader2, Sprout } from "lucide-react";
import { findMarketsNear } from "@/data/markets";
import { isMapsEnabled } from "@/data/mapbox";
import type { GeoZip, Market } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { Card, CardContent } from "@/components/ui/card";
import { MapViewLazy as MapView, type MapMarker } from "@/components/MapViewLazy";
import { EmptyState, InfoNote, MapsDisabledNote } from "@/components/common";

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
        exposure to recalled pre-packaged products. Markets below come from Mapbox within 25 miles of{" "}
        {geo.place}. Always confirm hours before visiting.
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
                      <div className="mt-2 flex items-center gap-3 text-xs">
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
                      </div>
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
