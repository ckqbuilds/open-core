import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Map as MapIcon, Navigation, Phone, Globe, X } from "lucide-react";
import { mapboxToken } from "@/data/mapbox";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  color: string;
  address?: string;
  distanceMi?: number;
  phone?: string; // 10-digit string, no formatting
  website?: string; // full https URL
}

function formatPhone(digits: string): string {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
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
        : "mapbox://styles/mapbox/light-v11",
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
          "width:16px;height:16px;border-radius:50%;background:#2ba0ff;border:2.5px solid #2c2e2a";
        el.title = "Your ZIP";
        el.setAttribute("aria-label", "Your ZIP");
        markersRef.current.push(
          new mapboxgl.Marker(el).setLngLat([center.lng, center.lat]).addTo(map)
        );
      }

      for (const m of markers) {
        const el = document.createElement("button");
        el.type = "button";
        el.style.cssText = `width:20px;height:20px;border-radius:50%;background:${m.color};border:2.5px solid #2c2e2a;cursor:pointer;padding:0`;
        el.title = m.label;
        el.setAttribute("aria-label", m.label);
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
        className="flex items-center justify-center rounded-lg border-2 border-dashed border-rule text-center text-sm text-ink-2"
        style={{ height }}
      >
        <div className="max-w-xs p-4">
          <MapIcon className="mx-auto mb-2 size-5" aria-hidden />
          The map isn't available right now. The listings still work from your ZIP.
        </div>
      </div>
    );
  }

  return (
    <div className="lobe--soft relative overflow-hidden border-2 border-ink">
      <div ref={containerRef} style={{ height }} className="w-full" />
      {selected && (
        <div className="sheet absolute bottom-3 left-3 right-3 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{selected.label}</div>
              {selected.sublabel && <div className="truncate text-xs text-ink-2">{selected.sublabel}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {selected.distanceMi != null && (
                  <span className="text-ink-2">
                    {selected.distanceMi.toFixed(1)} mi
                  </span>
                )}
                <a
                  className="link inline-flex items-center gap-1"
                  href={`https://maps.apple.com/?daddr=${selected.lat},${selected.lng}&q=${encodeURIComponent(selected.label)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="size-3" /> Directions
                </a>
                {selected.phone && (
                  <a
                    className="link inline-flex items-center gap-1"
                    href={`tel:+1${selected.phone}`}
                  >
                    <Phone className="size-3" /> {formatPhone(selected.phone)}
                  </a>
                )}
                {selected.website && (
                  <a
                    className="link inline-flex items-center gap-1"
                    href={selected.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe className="size-3" /> Website
                  </a>
                )}
              </div>
            </div>
            <button type="button" className="capsule capsule--sm px-2" aria-label="Close" onClick={() => setSelected(null)}>
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
