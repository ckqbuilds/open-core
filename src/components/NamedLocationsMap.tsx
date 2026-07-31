import { Loader2, Store, Utensils } from "lucide-react";
import { findNamedStoresNear } from "@/data/stores";
import { isMapsEnabled } from "@/data/mapbox";
import type { GeoZip, NamedEntity, StoreLocation } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapViewLazy as MapView, type MapMarker } from "@/components/MapViewLazy";
import { EmptyState, SourceLink, MapsDisabledNote } from "@/components/common";

const KIND_COLOR: Record<string, string> = {
  restaurant: "#eb6834", // orange
  retailer: "#e34948", // red
};

/**
 * Maps nearby locations of a specific set of FDA/CDC-named entities. Used on the
 * per-outbreak page (scoped to that outbreak's named entities). Never decides
 * risk — it just plots named companies near the user, each with a citation.
 */
export function NamedLocationsMap({ entities, geo }: { entities: NamedEntity[]; geo: GeoZip | null }) {
  const mapsOn = isMapsEnabled();
  const stores = useAsync<StoreLocation[]>(
    (signal) => findNamedStoresNear(geo!, entities, 25, signal),
    [geo?.zip, entities.map((e) => e.id).join(",")],
    !!geo && mapsOn && entities.length > 0
  );

  if (entities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No named companies have been compiled for this outbreak yet.
      </p>
    );
  }
  if (!mapsOn) return <MapsDisabledNote />;
  if (!geo) {
    return <EmptyState>Enter your ZIP in the top bar to map named locations near you.</EmptyState>;
  }

  const locations = stores.data ?? [];
  const byEntity = new Map<string, StoreLocation[]>();
  for (const s of locations) {
    const list = byEntity.get(s.entityId) ?? [];
    list.push(s);
    byEntity.set(s.entityId, list);
  }

  const markers: MapMarker[] = locations.slice(0, 60).map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    label: s.name,
    sublabel: s.address ?? `${s.distanceMi.toFixed(1)} mi away`,
    color: KIND_COLOR[s.kind] ?? "#e34948",
  }));

  return (
    <div className="space-y-4">
      {stores.error && (
        <EmptyState>
          Couldn't load nearby locations ({stores.error}).{" "}
          <button className="text-primary hover:underline" onClick={stores.reload}>
            Retry
          </button>
        </EmptyState>
      )}

      {!stores.loading && !stores.error && (
        <MapView markers={markers} center={{ lat: geo.lat, lng: geo.lng }} />
      )}

      {stores.loading && (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Finding locations within 25 miles of{" "}
          {geo.place}…
        </div>
      )}

      {!stores.loading &&
        !stores.error &&
        entities.map((e) => {
          const list = (byEntity.get(e.id) ?? []).slice(0, 8);
          return (
            <div key={e.id}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {e.kind === "restaurant" ? (
                  <Utensils className="size-4 text-muted-foreground" />
                ) : (
                  <Store className="size-4 text-muted-foreground" />
                )}
                <span className="font-medium">{e.name}</span>
                {e.product && <Badge variant="secondary">{e.product}</Badge>}
                <SourceLink source={e.source} />
              </div>
              <p className="mb-2 text-sm text-muted-foreground">{e.note}</p>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No {e.name} locations found within 25 miles.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {list.map((loc) => (
                    <Card key={loc.id}>
                      <CardContent className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{loc.name}</div>
                          {loc.address && (
                            <div className="truncate text-xs text-muted-foreground">{loc.address}</div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {loc.distanceMi.toFixed(1)} mi
                          </span>
                          <a
                            className="text-xs font-medium text-primary hover:underline"
                            href={`https://maps.apple.com/?ll=${loc.lat},${loc.lng}&q=${encodeURIComponent(loc.name)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Map
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
