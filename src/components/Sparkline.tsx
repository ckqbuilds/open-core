/**
 * Dependency-free sparkline — a minimal inline-SVG bar strip for a single
 * series (no chart library). Chartjunk-free by design: no axes, gridlines, or
 * labels, one accent color via `currentColor` (so it inherits the theme accent
 * in both light and dark). Set the color on a parent, e.g. `text-primary`.
 *
 * Accessibility: the wrapper is `role="img"` carrying the caller's `ariaLabel`,
 * which should summarize the trend (the bars themselves are decorative).
 */

interface SparklineProps {
  values: number[];
  ariaLabel: string;
  className?: string;
}

// Fixed viewBox; bars are laid out in these coordinates and scaled by CSS.
const VIEW_W = 100;
const VIEW_H = 32;
const GAP = 2; // gap between bars, in viewBox units
const MIN_H = 1; // floor so a zero year still shows a sliver

export function Sparkline({ values, ariaLabel, className }: SparklineProps) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;

  const max = Math.max(...clean);
  const barW = (VIEW_W - GAP * (clean.length - 1)) / clean.length;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`text-primary ${className ?? ""}`}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="h-8 w-full"
        aria-hidden="true"
        focusable="false"
      >
        {clean.map((v, i) => {
          // Guard against all-zero data (max === 0 → flat minimal bars).
          const h = max > 0 ? Math.max((v / max) * VIEW_H, MIN_H) : MIN_H;
          const x = i * (barW + GAP);
          return (
            <rect
              key={i}
              x={x}
              y={VIEW_H - h}
              width={barW}
              height={h}
              rx={0.75}
              fill="currentColor"
            />
          );
        })}
      </svg>
    </div>
  );
}
