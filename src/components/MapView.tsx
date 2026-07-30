import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Map as MapIcon } from "lucide-react";
import { mapboxToken } from "@/data/mapbox";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  color: string;
}

/**
 * Interactive Mapbox map. Adapted from the family-hub pattern: container/map/
 * markers refs, data-derived markers, fit-to-bounds, selection popup. Renders a
 * disabled state when no token is configured so the page degrades gracefully.
 */
export function MapView({
  markers,
  center,
  height = 380,
}: {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const token = mapboxToken();

  // Init map once.
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const isDark = document.documentElement.classList.contains("dark");
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDark
        ? "mapbox://styles/mapbox/navigation-night-v1"
        : "mapbox://styles/mapbox/streets-v12",
      center: center ? [center.lng, center.lat] : [-98.5, 39.8],
      zoom: center ? 10 : 3,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [token, center?.lat, center?.lng]);

  // Render markers + fit bounds when the set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Center marker (your ZIP), if provided.
      if (center) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:14px;height:14px;border-radius:50%;background:#2a78d6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)";
        el.title = "Your ZIP";
        markersRef.current.push(
          new mapboxgl.Marker(el).setLngLat([center.lng, center.lat]).addTo(map)
        );
      }

      for (const m of markers) {
        const el = document.createElement("button");
        el.type = "button";
        el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${m.color};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.3);cursor:pointer;padding:0`;
        el.title = m.label;
        el.onclick = (e) => {
          e.stopPropagation();
          setSelected(m);
          map.flyTo({ center: [m.lng, m.lat], zoom: 14, duration: 500 });
        };
        markersRef.current.push(
          new mapboxgl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map)
        );
      }

      const pts: [number, number][] = [
        ...(center ? [[center.lng, center.lat] as [number, number]] : []),
        ...markers.map((m) => [m.lng, m.lat] as [number, number]),
      ];
      if (pts.length > 1) {
        const bounds = pts.reduce(
          (b, p) => b.extend(p),
          new mapboxgl.LngLatBounds(pts[0], pts[0])
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 500 });
      } else if (pts.length === 1) {
        map.flyTo({ center: pts[0], zoom: 12, duration: 500 });
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
  }, [markers, center?.lat, center?.lng]);

  if (!token) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 text-center text-sm text-muted-foreground"
        style={{ height }}
      >
        <div className="max-w-xs p-4">
          <MapIcon className="mx-auto mb-2 size-5" />
          Map disabled — add a Mapbox token (<code className="text-xs">VITE_MAPBOX_TOKEN</code>) in
          <code className="text-xs"> .env.local</code> to enable the map and location search.
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <div ref={containerRef} style={{ height }} className="w-full" />
      {selected && (
        <div className="absolute bottom-3 left-3 right-3 rounded-md border bg-card p-3 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{selected.label}</div>
              {selected.sublabel && (
                <div className="truncate text-xs text-muted-foreground">{selected.sublabel}</div>
              )}
            </div>
            <button
              className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
