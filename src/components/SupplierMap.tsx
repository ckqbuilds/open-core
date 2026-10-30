import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { EDGES, NODES, PLANTS, TIER_LABEL, chainOf, edgeOn, type Tier } from "@/data/supplyChain";
import { PlantNumbers } from "@/components/SupplyParts";
import { cn } from "@/lib/utils";

const ROW = 66;
const TOP = 44;
const GROUP_GAP = 20;
const COL_X = [16, 216, 416, 616];
const NODE_W = 176;
const WIDTH = COL_X[3] + NODE_W + 16;
const COLUMN_HEADS = ["Company", "Supplier's plant · USDA no.", "Brand on the package", "Where it was sold"];

interface Placed {
  id: string;
  x: number;
  y: number;
}

/** Bands top to bottom, one per supplier; within a band each tier is centred. */
function layout() {
  const placed: Placed[] = [];
  const rules: number[] = [];
  const groups = [...new Set(NODES.map((x) => x.group))];
  let y = TOP;
  groups.forEach((g, i) => {
    const tiers = ([0, 1, 2, 3] as Tier[]).map((t) => NODES.filter((x) => x.group === g && x.tier === t));
    const rows = Math.max(...tiers.map((a) => a.length));
    if (i > 0) rules.push(y - GROUP_GAP / 2);
    tiers.forEach((arr, t) =>
      arr.forEach((x, k) => placed.push({ id: x.id, x: COL_X[t], y: y + ((rows - arr.length) / 2 + k) * ROW + 6 }))
    );
    y += rows * ROW + GROUP_GAP;
  });
  return { placed, rules, height: y };
}

interface EdgePath {
  key: string;
  edge: number;
  d: string;
  ownership: boolean;
  on: boolean;
}

/**
 * The supplier map: company → supplier's plant → brand → store, left to right.
 * Clicking a box lights its chain (everything upstream and downstream of it)
 * and fades the rest; the parent page owns the selection.
 */
export function SupplierMap({
  selected,
  onSelect,
  onHover,
  onFocusNode,
  onLeave,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null, e: React.PointerEvent) => void;
  onFocusNode: (id: string, el: HTMLElement) => void;
  onLeave: () => void;
}) {
  const { placed, rules, height } = useMemo(layout, []);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Omit<EdgePath, "on">[]>([]);
  const chain = useMemo(() => (selected ? chainOf(selected) : null), [selected]);

  // Edges join the measured boxes, so they follow node heights that wrap.
  useLayoutEffect(() => {
    const measure = () =>
      setPaths(
        EDGES.flatMap((e, i) => {
          const a = nodeRefs.current[e.from];
          const b = nodeRefs.current[e.to];
          if (!a || !b) return [];
          const x1 = a.offsetLeft + a.offsetWidth;
          const y1 = a.offsetTop + a.offsetHeight / 2;
          const x2 = b.offsetLeft;
          const y2 = b.offsetTop + b.offsetHeight / 2;
          const mx = (x1 + x2) / 2;
          return [{ key: `${e.from}-${e.to}-${i}`, edge: i, d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, ownership: e.evidence === "ownership" }];
        })
      );
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  const byId = Object.fromEntries(NODES.map((x) => [x.id, x]));

  return (
    <div className="sheet overflow-x-auto" onPointerLeave={onLeave}>
      <div
        ref={boxRef}
        className="relative"
        style={{ width: WIDTH, height }}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("button")) onSelect(null);
        }}
      >
        <svg aria-hidden className="pointer-events-none absolute inset-0" width={WIDTH} height={height}>
          {paths.map((p) => {
            const on = !!chain && edgeOn(EDGES[p.edge], chain);
            return (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                strokeDasharray={p.ownership ? "5 4" : undefined}
                className={cn(
                  "transition-opacity duration-200",
                  on ? "stroke-ink" : "stroke-[var(--ink-2)]",
                  chain && !on && "opacity-20"
                )}
                strokeWidth={on ? 2.5 : 1.5}
              />
            );
          })}
        </svg>

        {COLUMN_HEADS.map((h, i) => (
          <div key={h} className="absolute top-3.5 text-xs font-bold text-ink-2" style={{ left: COL_X[i] }}>
            {h}
          </div>
        ))}
        {rules.map((y) => (
          <div key={y} aria-hidden className="absolute inset-x-4 border-t border-dashed border-rule" style={{ top: y }} />
        ))}

        {placed.map(({ id, x, y }) => {
          const node = byId[id];
          const on = !chain || chain.has(id);
          const isSel = selected === id;
          const plant = PLANTS[id];
          return (
            <button
              key={id}
              ref={(el) => {
                nodeRefs.current[id] = el;
              }}
              type="button"
              aria-pressed={isSel}
              aria-label={`${TIER_LABEL[node.tier]}: ${node.name}${plant ? `, plant numbers ${plant.establishments.join(", ")}` : ""}`}
              onClick={() => onSelect(isSel ? null : id)}
              onPointerMove={(e) => onHover(id, e)}
              onFocus={(e) => onFocusNode(id, e.currentTarget)}
              onBlur={onLeave}
              className={cn(
                "absolute grid gap-px rounded-lg border-[1.5px] px-2.5 py-1.5 text-left transition-opacity duration-200",
                node.tier === 0 ? "border-ink bg-ink text-ground" : "border-ink bg-paper text-ink",
                chain && on && node.tier !== 0 && "border-2",
                isSel && "border-ink bg-sun text-on-fill",
                !on && "opacity-30 grayscale"
              )}
              style={{ left: x, top: y, width: NODE_W }}
            >
              <span className={cn("leading-tight", node.tier === 2 ? "text-base font-extrabold" : "text-sm font-bold")}>{node.name}</span>
              {node.sub && <span className={cn("text-xs leading-tight", node.tier === 0 && !isSel ? "text-ground/75" : "text-ink-2")}>{node.sub}</span>}
              {plant && <PlantNumbers establishments={plant.establishments} className="mt-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
