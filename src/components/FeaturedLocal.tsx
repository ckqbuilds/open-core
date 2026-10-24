import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Globe, Phone, RefreshCw, MapPin } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Lobe, Loading } from "@/components/common";
import { findAllMarketsNear, DIRECTORIES, type MergedMarket } from "@/data/markets";
import { DIRECTORY_ICONS } from "@/lib/icons";
import type { GeoZip } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";

function formatPhone(digits: string): string {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

/** Small shared shell so every state keeps the same spotlight footprint: one pond lobe. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Lobe tone="pond" soft className="p-6 sm:p-8">
      {children}
    </Lobe>
  );
}

/**
 * A positive nudge on the home page: spotlight ONE randomly chosen local food
 * source near the user's ZIP. Works without Mapbox (USDA proxy + ZIP geocoding);
 * every failure mode degrades to a quiet, honest block rather than crashing.
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

  // No ZIP yet: the front door at the top of home asks for it; nothing to show here.
  if (!geo) return null;

  if (markets.loading) {
    return (
      <Frame>
        <h2 className="display-md text-2xl">A local source near {geo.place}</h2>
        <Loading className="h-16 justify-start text-on-fill">Finding a local spot near {geo.place}…</Loading>
      </Frame>
    );
  }

  // Errors and true emptiness: nothing to feature. Shop local explains on its own page.
  if (markets.error || list.length === 0) return null;

  const m = list[Math.min(index, list.length - 1)];

  return (
    <Frame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="display-md text-2xl">A local source near {geo.place}</h2>
        {list.length > 1 && (
          <button type="button" onClick={showAnother} className="capsule capsule--sm">
            <RefreshCw className="size-4" aria-hidden /> Show another
          </button>
        )}
      </div>

      <p className="display mt-4 text-3xl sm:text-4xl">{m.name}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
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

      <p className="tnum mt-3 flex flex-wrap items-center gap-x-2 text-sm">
        <span className="inline-flex items-center gap-1 font-semibold">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {(m.distanceMi ?? 0).toFixed(1)} mi away
        </span>
        {m.address && <span>{m.address}</span>}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          className="capsule capsule--sm"
          href={`https://maps.apple.com/?ll=${m.lat},${m.lng}&q=${encodeURIComponent(m.name)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin className="size-4" aria-hidden /> Map
        </a>
        {m.phone && (
          <a className="capsule capsule--sm tnum" href={`tel:+1${m.phone}`}>
            <Phone className="size-4" aria-hidden />
            {formatPhone(m.phone)}
          </a>
        )}
        {m.website && (
          <a className="capsule capsule--sm" href={m.website} target="_blank" rel="noreferrer">
            <Globe className="size-4" aria-hidden /> Website
          </a>
        )}
        <Link className="capsule capsule--sm capsule--ink" to="/shop-local">
          All local spots <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <p className="prose-measure mt-5 text-sm">
        Listed in the USDA Local Food Directories: farmers markets, CSAs, on-farm markets, food hubs, and agritourism.
      </p>
    </Frame>
  );
}
