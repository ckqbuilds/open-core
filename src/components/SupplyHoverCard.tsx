import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { classificationTitle } from "@/lib/classification";
import { formatIso } from "@/lib/utils";
import {
  NODE_BY_ID,
  PLANTS,
  TIER_LABEL,
  chainOf,
  plantsIn,
  recallsIn,
  type ChainRecall,
} from "@/data/supplyChain";
import { HazardChip, MadeAt, PlantTie } from "@/components/SupplyParts";

export interface HoverTarget {
  id: string;
  x: number;
  y: number;
}

/**
 * Hover state for the supply views: follows a mouse pointer, or sits under a
 * focused element. Touch never opens it; a tap selects instead.
 */
export function useSupplyHover() {
  const [target, setTarget] = useState<HoverTarget | null>(null);

  const fromPointer = useCallback((id: string | null, e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setTarget(id ? { id, x: e.clientX, y: e.clientY } : null);
  }, []);

  const fromFocus = useCallback((id: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setTarget({ id, x: r.left, y: r.bottom - 6 });
  }, []);

  const clear = useCallback(() => setTarget(null), []);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTarget(null);
    window.addEventListener("scroll", clear, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", clear);
      window.removeEventListener("keydown", onKey);
    };
  }, [target, clear]);

  return { target, fromPointer, fromFocus, clear };
}

const SEVERITY: Record<ChainRecall["classification"], string> = {
  "Class I": "Class I, could cause serious harm",
  "Class II": "Class II, could cause temporary harm",
  "Public Health Alert": "Health alert, product likely off shelves",
  "Outbreak investigation": "Outbreak, people have gotten sick",
};

/**
 * The card that follows the cursor: what was found, how serious, which packages,
 * what to do, and which supplier's plant number to look for.
 */
export function SupplyHoverCard({
  target,
  recalls,
  hint,
}: {
  target: HoverTarget | null;
  recalls: Record<string, ChainRecall>;
  hint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!target || !ref.current) return;
    const pad = 14;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    let left = target.x + pad;
    let top = target.y + pad;
    if (left + w > window.innerWidth - 8) left = target.x - w - pad;
    if (top + h > window.innerHeight - 8) top = Math.max(8, target.y - h - pad);
    setPos({ left: Math.max(8, left), top });
  }, [target]);

  if (!target) return null;
  const node = NODE_BY_ID[target.id];
  if (!node) return null;
  const chain = chainOf(node.id);
  const all = recallsIn(chain, recalls);
  const shown = all.slice(0, 2);
  const plant = PLANTS[node.id];
  const plants = plantsIn(chain).map((p) => p.plant);

  return (
    <div
      ref={ref}
      role="tooltip"
      className="sheet pointer-events-none fixed z-50 grid w-[18rem] max-w-[calc(100vw-1.5rem)] gap-3 p-4"
      style={{ left: pos.left, top: pos.top }}
    >
      <div>
        <div className="text-xs font-bold text-ink-2">
          {TIER_LABEL[node.tier]}
          {all.length > 1 && ` · ${all.length} recalls`}
        </div>
        <div className="display-md text-xl">{node.name}</div>
      </div>

      {plant ? (
        <PlantTie plant={plant} />
      ) : plants.length > 0 ? (
        <MadeAt plants={plants} />
      ) : node.tier === 1 ? (
        <p className="text-sm text-ink-2">The notice doesn't print a USDA plant number for this source, so match by brand, lot and date.</p>
      ) : null}

      {shown.map((r) => (
        <div key={r.key} className="space-y-1 border-t border-rule pt-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <HazardChip recall={r} />
            <span className="font-bold">{r.hazard}</span>
          </div>
          <p className="text-ink-2" title={classificationTitle(r.classification)}>
            <span className="font-semibold text-ink">{SEVERITY[r.classification]}</span> · {formatIso(r.date)}
          </p>
          {r.window && <p className="text-ink-2">{r.window}</p>}
          {r.note && <p className="text-ink-2">{r.note}</p>}
          <p className="font-semibold">{r.action}</p>
          <p className="text-xs text-ink-2">
            {r.agency === "FSIS" ? "USDA FSIS" : "FDA"} <span className="font-mono">{r.reference}</span> · {r.status}
          </p>
        </div>
      ))}
      {all.length > 2 && <p className="text-xs text-ink-2">+{all.length - 2} more on this chain</p>}
      {hint && <p className="text-xs text-ink-2">{hint}</p>}
    </div>
  );
}
