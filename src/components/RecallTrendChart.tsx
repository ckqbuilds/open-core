import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Recall } from "@/data/types";

interface Bucket {
  month: string; // YYYY-MM
  label: string;
  count: number;
}

function bucketByMonth(recalls: Recall[]): Bucket[] {
  const counts = new Map<string, number>();
  for (const r of recalls) {
    const raw = r.reportDate ?? r.recallInitiationDate;
    if (!raw || raw.length !== 8) continue;
    const key = `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.keys()].sort();
  if (sorted.length === 0) return [];
  // Fill gaps between first and last month so the axis reads continuously.
  const out: Bucket[] = [];
  const [sy, sm] = sorted[0].split("-").map(Number);
  const [ey, em] = sorted[sorted.length - 1].split("-").map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const d = new Date(y, m - 1, 1);
    out.push({
      month: key,
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      count: counts.get(key) ?? 0,
    });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out.slice(-18); // last 18 months
}

export function RecallTrendChart({ recalls }: { recalls: Recall[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<{ x: number; b: Bucket } | null>(null);
  const data = useMemo(() => bucketByMonth(recalls), [recalls]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 240;
  const margin = { top: 16, right: 12, bottom: 28, left: 32 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;

  const x = useMemo(
    () => d3.scaleBand<string>().domain(data.map((d) => d.month)).range([0, innerW]).padding(0.35),
    [data, innerW]
  );
  const maxCount = d3.max(data, (d) => d.count) ?? 1;
  const y = useMemo(
    () => d3.scaleLinear().domain([0, Math.max(1, maxCount)]).nice().range([innerH, 0]),
    [maxCount, innerH]
  );

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    if (data.length === 0) return;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // y gridlines (recessive hairlines)
    const ticks = y.ticks(4);
    g.append("g")
      .selectAll("line")
      .data(ticks)
      .join("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "var(--viz-grid)").attr("stroke-width", 1);

    g.append("g")
      .selectAll("text")
      .data(ticks)
      .join("text")
      .attr("x", -8).attr("y", (d) => y(d))
      .attr("dy", "0.32em").attr("text-anchor", "end")
      .attr("fill", "var(--viz-muted)").attr("font-size", 11)
      .style("font-variant-numeric", "tabular-nums")
      .text((d) => d);

    // x labels — thin them out if crowded
    const every = Math.ceil(data.length / 12);
    g.append("g")
      .selectAll("text")
      .data(data.filter((_, i) => i % every === 0))
      .join("text")
      .attr("x", (d) => (x(d.month) ?? 0) + x.bandwidth() / 2)
      .attr("y", innerH + 18)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--viz-muted)").attr("font-size", 11)
      .text((d) => d.label);

    // baseline
    g.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", innerH).attr("y2", innerH)
      .attr("stroke", "var(--viz-axis)").attr("stroke-width", 1);

    // bars — thin, rounded data-end, anchored to baseline
    g.append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (d) => x(d.month) ?? 0)
      .attr("width", x.bandwidth())
      .attr("y", (d) => (d.count === 0 ? innerH : y(d.count)))
      .attr("height", (d) => (d.count === 0 ? 0 : innerH - y(d.count)))
      .attr("rx", 3)
      .attr("fill", "var(--viz-s1)");
  }, [data, x, y, innerW, innerH, margin.left, margin.top]);

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No dated recall records to chart yet.
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label="Food recalls per month"
        onMouseMove={(e) => {
          const rect = svgRef.current!.getBoundingClientRect();
          const mx = e.clientX - rect.left - margin.left;
          let best: Bucket | null = null;
          let bestX = 0;
          for (const d of data) {
            const bx = (x(d.month) ?? 0) + x.bandwidth() / 2;
            if (best === null || Math.abs(bx - mx) < Math.abs(bestX - mx)) {
              best = d; bestX = bx;
            }
          }
          if (best) setHover({ x: bestX + margin.left, b: best });
        }}
        onMouseLeave={() => setHover(null)}
      />
      {hover && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: Math.min(Math.max(hover.x, 60), width - 60) }}
        >
          <div className="font-medium">{hover.b.label}</div>
          <div className="text-muted-foreground">
            {hover.b.count} recall{hover.b.count === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </div>
  );
}
