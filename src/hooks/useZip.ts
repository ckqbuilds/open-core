import { useCallback, useEffect, useState } from "react";
import { geocodeZip } from "@/data/geo";
import type { GeoZip } from "@/data/types";
import { useAsync } from "./useAsync";

const KEY = "opencore.zip";

/** Persisted ZIP + its geocoded centroid, shared across the dashboard. */
export function useZip() {
  const [zip, setZipState] = useState<string>(() => localStorage.getItem(KEY) ?? "");

  const setZip = useCallback((next: string) => {
    const clean = next.trim();
    setZipState(clean);
    if (clean) localStorage.setItem(KEY, clean);
    else localStorage.removeItem(KEY);
  }, []);

  const valid = /^\d{5}$/.test(zip);
  const geo = useAsync<GeoZip | null>(
    (signal) => geocodeZip(zip, signal),
    [zip],
    valid
  );

  useEffect(() => {
    // no-op: keeps hook shape stable; geocode runs via useAsync
  }, [zip]);

  return {
    zip,
    setZip,
    valid,
    geo: geo.data ?? null,
    geoLoading: geo.loading,
    geoError: valid && !geo.loading && !geo.data ? "ZIP not found" : geo.error,
  };
}
