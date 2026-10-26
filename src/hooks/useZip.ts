import { useCallback, useEffect, useState } from "react";
import { geocodeZip } from "@/data/geo";
import type { GeoZip } from "@/data/types";
import { useAsync } from "./useAsync";

const KEY = "opencore.zip";

/** Persisted ZIP + its geocoded centroid, shared across the dashboard. */
export function useZip() {
  const [zip, setZipState] = useState<string>(() => localStorage.getItem(KEY) ?? "");

  const setZip = useCallback((next: string) => {
    setZipState(next.trim());
  }, []);

  const valid = /^\d{5}$/.test(zip);
  const geo = useAsync<GeoZip | null>(
    (signal) => geocodeZip(zip, signal),
    [zip],
    valid
  );

  // The last ZIP that resolved stays active while a bad or partial value is typed.
  const [lastGeo, setLastGeo] = useState<GeoZip | null>(null);
  useEffect(() => {
    if (!zip) setLastGeo(null);
    else if (geo.data?.zip === zip) setLastGeo(geo.data);
  }, [zip, geo.data]);
  const resolved = geo.data?.zip === zip ? geo.data : null;
  const keep = !resolved && zip && !geo.loading ? lastGeo : null;
  const failed = valid && !geo.loading && !resolved;
  const keepLabel = keep ? `${keep.place}, ${keep.stateAbbr}` : "";
  const notFound = failed
    ? `We couldn't find ${zip}.${keepLabel ? ` Still showing ${keepLabel}.` : " Check the 5 digits."}`
    : null;

  // Persist only a 5-digit ZIP that geocoded; an invalid one stays in state.
  useEffect(() => {
    try {
      // Clear only when emptied; a failed lookup leaves a previously stored ZIP alone.
      if (!zip) localStorage.removeItem(KEY);
      else if (valid && geo.data?.zip === zip) localStorage.setItem(KEY, zip);
    } catch {
      /* storage unavailable */
    }
  }, [zip, valid, geo.data, geo.loading]);

  return {
    zip,
    setZip,
    valid,
    // Ignore a previous ZIP's result while the new one is still resolving.
    geo: resolved ?? keep,
    geoLoading: geo.loading,
    geoError: failed ? notFound : geo.error,
  };
}
