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

  // Persist only a 5-digit ZIP that geocoded; an invalid one stays in state.
  useEffect(() => {
    try {
      if (!zip) localStorage.removeItem(KEY);
      else if (valid && geo.data) localStorage.setItem(KEY, zip);
    } catch {
      /* storage unavailable */
    }
  }, [zip, valid, geo.data]);

  return {
    zip,
    setZip,
    valid,
    geo: geo.data ?? null,
    geoLoading: geo.loading,
    geoError: valid && !geo.loading && !geo.data ? "ZIP not found" : geo.error,
  };
}
