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
      else if (valid && geo.data?.zip === zip) localStorage.setItem(KEY, zip);
      else if (valid && !geo.loading && geo.data?.zip !== zip) localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }, [zip, valid, geo.data, geo.loading]);

  return {
    zip,
    setZip,
    valid,
    // Ignore a previous ZIP's result while the new one is still resolving.
    geo: geo.data?.zip === zip ? geo.data : null,
    geoLoading: geo.loading,
    geoError: valid && !geo.loading && geo.data?.zip !== zip && !geo.error ? "We couldn't find that ZIP. Check the 5 digits." : geo.error,
  };
}
