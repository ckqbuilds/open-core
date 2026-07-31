import { createContext, useContext, type ReactNode } from "react";
import { useZip } from "./useZip";

type ZipValue = ReturnType<typeof useZip>;

const ZipContext = createContext<ZipValue | null>(null);

/** Provides the persisted ZIP + geocoded centroid to the whole routed app. */
export function ZipProvider({ children }: { children: ReactNode }) {
  const zip = useZip();
  return <ZipContext.Provider value={zip}>{children}</ZipContext.Provider>;
}

export function useZipContext(): ZipValue {
  const ctx = useContext(ZipContext);
  if (!ctx) throw new Error("useZipContext must be used within a ZipProvider");
  return ctx;
}
