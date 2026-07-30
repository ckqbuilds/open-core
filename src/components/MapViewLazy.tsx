import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { MapMarker } from "./MapView";

// Code-split mapbox-gl (~2 MB) into its own chunk so it only loads when a map
// is actually shown, not on the default Recalls tab.
const MapView = lazy(() => import("./MapView").then((m) => ({ default: m.MapView })));

export type { MapMarker };

export function MapViewLazy(props: {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  height?: number;
}) {
  const height = props.height ?? 380;
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground"
          style={{ height }}
        >
          <Loader2 className="mr-2 size-4 animate-spin" /> Loading map…
        </div>
      }
    >
      <MapView {...props} />
    </Suspense>
  );
}
