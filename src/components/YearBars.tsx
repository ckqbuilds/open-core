/**
 * Dependency-free labeled bar chart for a short per-year series (no chart
 * library). Each bar carries its value above and its year below, and a dashed
 * rule marks the series average so a reader can see which years ran high or
 * low. Bars start at zero and use `currentColor` (the wrapper sets
 * `text-land-deep`), so they inherit the theme accent in light and dark.
 *
 * Laid out in HTML rather than a stretched SVG so the labels never distort.
 * Accessibility: the wrapper is `role="img"` carrying the caller's `ariaLabel`;
 * the visible labels are hidden from assistive tech to avoid double reading.
 */

interface YearBarsProps {
  data: { year: number; value: number }[];
  ariaLabel: string;
  className?: string;
}

const BAR_AREA_PX = 64;
const MIN_PCT = 2; // floor so a zero year still shows a sliver

export function YearBars({ data, ariaLabel, className }: YearBarsProps) {
  const clean = data.filter((d) => Number.isFinite(d.value));
  if (clean.length === 0) return null;

  const max = Math.max(...clean.map((d) => d.value));
  const avg = clean.reduce((s, d) => s + d.value, 0) / clean.length;
  const pct = (v: number) => (max > 0 ? Math.max((v / max) * 100, MIN_PCT) : MIN_PCT);

  return (
    <div role="img" aria-label={ariaLabel} className={className}>
      <div aria-hidden="true" className="relative">
        {/* Average rule, drawn behind the bars within the bar area. */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-2"
          style={{ bottom: `calc(1.25rem + ${(pct(avg) / 100) * BAR_AREA_PX}px)` }}
        />
        <div className="flex items-end gap-1 sm:gap-2">
          {clean.map((d) => (
            <div key={d.year} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="tnum text-[11px] leading-4 text-ink sm:text-xs">{d.value}</span>
              <div className="flex w-full items-end" style={{ height: BAR_AREA_PX }}>
                <div
                  className="w-full rounded-t-sm bg-current text-land-deep"
                  style={{ height: `${pct(d.value)}%` }}
                />
              </div>
              <span className="tnum mt-1 h-4 text-[11px] leading-4 text-ink-2 sm:text-xs">
                <span className="sm:hidden">’{String(d.year).slice(-2)}</span>
                <span className="hidden sm:inline">{d.year}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
