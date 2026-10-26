import { Chip } from "@/components/ui/chip";
import { useEffect, useState } from "react";
import { Globe, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { findAllMarketsNear, DIRECTORIES, type MergedMarket } from "@/data/markets";
import { isMapsEnabled } from "@/data/mapbox";
import type { GeoZip, UsdaDirectory } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { DIRECTORY_ICONS } from "@/lib/icons";
import { MapViewLazy as MapView, type MapMarker } from "@/components/MapViewLazy";
import { EmptyState, InfoNote, Loading, MapsDisabledNote } from "@/components/common";

function formatPhone(digits: string): string {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

const PAGE_SIZES = [10, 20, 40, 50];

/** Local food sources are land green on the map: the one allowed hex in this file. */
const MARKER_COLOR = "#8ed462";

/** "all" shows the full merged list; a directory id narrows to that type. */
type Filter = UsdaDirectory | "all";

export function MarketsSection({
  geo,
  onCount,
}: {
  geo: GeoZip | null;
  /** Reports how many sources are listed (0 when nothing is). */
  onCount?: (n: number) => void;
}) {
  const mapsOn = isMapsEnabled();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // One fetch pulls every directory at once, then merges same-place listings.
  const markets = useAsync<MergedMarket[]>(
    (signal) => findAllMarketsNear(geo!, 25, signal),
    [geo?.zip],
    !!geo
  );

  const listed = markets.data?.length ?? 0;
  useEffect(() => onCount?.(geo ? listed : 0), [onCount, listed, geo]);

  // Back to page 1 whenever the filter, ZIP, or page size changes.
  useEffect(() => setPage(1), [filter, geo?.zip, pageSize]);

  if (!geo) return null;

  const all = markets.data ?? [];
  const list =
    filter === "all" ? all : all.filter((m) => m.directories.includes(filter));

  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageItems = list.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
  // Map shows every filtered result; only the rows below paginate.
  const mapMarkers: MapMarker[] = list.map((m) => ({
    id: m.id,
    lat: m.lat ?? 0,
    lng: m.lng ?? 0,
    label: m.name,
    sublabel: m.address ?? `${(m.distanceMi ?? 0).toFixed(1)} mi away`,
    color: MARKER_COLOR,
    address: m.address,
    distanceMi: m.distanceMi,
    phone: m.phone,
    website: m.website,
  }));

  const activeInfo = filter === "all" ? null : DIRECTORIES.find((d) => d.id === filter);
  const noun = activeInfo ? activeInfo.label.toLowerCase() : "local food sources";

  return (
    <div className="space-y-6">
      {!mapsOn && <MapsDisabledNote page="shop-local" />}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by directory type">
        <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className="capsule capsule--sm">
          All
          <span aria-hidden className="capsule__chip" />
        </button>
        {DIRECTORIES.map((d) => {
          const Icon = DIRECTORY_ICONS[d.id];
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={d.id === filter}
              onClick={() => setFilter(d.id)}
              className="capsule capsule--sm"
            >
              <Icon aria-hidden className="size-4" />
              {d.label}
              <span aria-hidden className="capsule__chip" />
            </button>
          );
        })}
      </div>

      <InfoNote>
        Buying whole, local produce and washing it yourself lets you control handling and reduce
        exposure to recalled pre-packaged products. Listings below combine all five USDA Local Food
        Directories within 25 miles of {geo.place} — a farm that appears in several shows one row
        with a badge for each kind it offers. Always confirm hours before visiting — call ahead.
      </InfoNote>

      {markets.error && (
        <EmptyState>
          Couldn't load markets ({String(markets.error)}).{" "}
          <button type="button" className="link" onClick={markets.reload}>
            Retry
          </button>
        </EmptyState>
      )}

      {mapsOn && !markets.loading && !markets.error && (
        <MapView markers={mapMarkers} center={{ lat: geo.lat, lng: geo.lng }} />
      )}

      {markets.loading && <Loading>Finding local food sources near {geo.place}…</Loading>}

      {!markets.loading && !markets.error &&
        (list.length === 0 ? (
          <EmptyState>
            {filter === "all" ? (
              <>
                No local food sources found within 25 miles. Try the{" "}
                <a className="link" href="https://www.usdalocalfoodportal.com/" target="_blank" rel="noreferrer">
                  USDA Local Food Directory
                </a>
                .
              </>
            ) : (
              <>
                No {noun} within 25 miles.{" "}
                <button type="button" className="link" onClick={() => setFilter("all")}>
                  Show all local food sources
                </button>
              </>
            )}
          </EmptyState>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-2">
              <span className="tnum">
                {list.length} {noun} found
              </span>
              <label className="flex items-center gap-2">
                Per page
                <select
                  className="field h-9 min-h-0 w-auto text-sm font-semibold"
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
            <div className="grid gap-x-8 sm:grid-cols-2">
              {pageItems.map((m) => (
                <div key={m.id} className="row-rule py-4">
                  <div className="font-extrabold">{m.name}</div>
                  {m.address && <div className="text-xs text-ink-2">{m.address}</div>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.directories.map((id) => {
                      const d = DIRECTORIES.find((x) => x.id === id);
                      if (!d) return null;
                      const Icon = DIRECTORY_ICONS[d.id];
                      return (
                        <Chip key={id} color="quiet">
                          <Icon aria-hidden className="size-3.5" />
                          {d.label}
                        </Chip>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-ink-2">{(m.distanceMi ?? 0).toFixed(1)} mi</span>
                    <a
                      className="link"
                      href={`https://maps.apple.com/?ll=${m.lat},${m.lng}&q=${encodeURIComponent(m.name)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Map
                    </a>
                    {m.phone && (
                      <a className="link tnum inline-flex items-center gap-1" href={`tel:+1${m.phone}`}>
                        <Phone className="size-3" aria-hidden />
                        {formatPhone(m.phone)}
                      </a>
                    )}
                    {m.website && (
                      <a className="link inline-flex items-center gap-1" href={m.website} target="_blank" rel="noreferrer">
                        <Globe className="size-3" aria-hidden /> Website
                      </a>
                    )}
                  </div>
                  {m.updatedAt && <div className="mt-1 text-xs text-ink-2">USDA listing updated {m.updatedAt}</div>}
                </div>
              ))}
            </div>
            {pageCount > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-sm">
                <button
                  type="button"
                  className="capsule capsule--sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={clampedPage <= 1}
                >
                  <ChevronLeft className="size-4" aria-hidden /> Prev
                </button>
                <span className="tnum text-ink-2">
                  Page {clampedPage} of {pageCount}
                </span>
                <button
                  type="button"
                  className="capsule capsule--sm"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={clampedPage >= pageCount}
                >
                  Next <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
