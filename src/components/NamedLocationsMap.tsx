import { Chip } from "@/components/ui/chip";
import { Store, Utensils } from "lucide-react";
import { findNamedStoresNear } from "@/data/stores";
import { isMapsEnabled } from "@/data/mapbox";
import type { GeoZip, NamedEntity, StoreLocation } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { MapViewLazy as MapView, type MapMarker } from "@/components/MapViewLazy";
import { EmptyState, Loading, SourceLink, MapsDisabledNote } from "@/components/common";

/** Marker fills: the two map colours are the one place hex is allowed in a component. */
const KIND_COLOR: Record<string, string> = {
  restaurant: "#f5e211", // sun
  retailer: "#ff705d", // coral
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
    return <p className="text-sm text-ink-2">No named companies have been compiled for this outbreak yet.</p>;
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
    color: KIND_COLOR[s.kind] ?? KIND_COLOR.retailer,
  }));

  return (
    <div className="space-y-6">
      {stores.error && (
        <EmptyState>
          Couldn't load nearby locations ({stores.error}).{" "}
          <button type="button" className="link" onClick={stores.reload}>
            Retry
          </button>
        </EmptyState>
      )}

      {!stores.loading && !stores.error && <MapView markers={markers} center={{ lat: geo.lat, lng: geo.lng }} />}

      {stores.loading && <Loading>Finding locations within 25 miles of {geo.place}…</Loading>}

      {!stores.loading &&
        !stores.error &&
        entities.map((e) => {
          const list = (byEntity.get(e.id) ?? []).slice(0, 8);
          return (
            <div key={e.id}>
              <div className="flex flex-wrap items-center gap-2">
                {e.kind === "restaurant" ? (
                  <Utensils className="size-5 text-land-deep" aria-hidden />
                ) : (
                  <Store className="size-5 text-land-deep" aria-hidden />
                )}
                <span className="text-lg font-extrabold">{e.name}</span>
                {e.product && <Chip color="quiet">{e.product}</Chip>}
                <SourceLink source={e.source} />
              </div>
              <p className="prose-measure mt-1 text-sm text-ink-2">{e.note}</p>
              {list.length === 0 ? (
                <p className="mt-2 text-sm text-ink-2">No {e.name} locations found within 25 miles.</p>
              ) : (
                <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
                  {list.map((loc) => (
                    <div key={loc.id} className="row-rule flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{loc.name}</div>
                        {loc.address && <div className="truncate text-xs text-ink-2">{loc.address}</div>}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-ink-2">{loc.distanceMi.toFixed(1)} mi</span>
                        <a
                          className="link text-xs"
                          href={`https://maps.apple.com/?ll=${loc.lat},${loc.lng}&q=${encodeURIComponent(loc.name)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Map
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
