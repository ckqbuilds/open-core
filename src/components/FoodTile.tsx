import { Link } from "react-router-dom";
import { ChevronRight, Activity, FileWarning } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import type { FoodEntry } from "@/data/foods";

/** Compact food-category summary — the whole HeroUI card links to its food page. */
export function FoodTile({ entry }: { entry: FoodEntry }) {
  const { category: c, outbreaks, recallCount, pathogens } = entry;
  const to = `/food/${c.id}`;

  return (
    <Card
      // Card defaults to a <div>; render its root as the router Link. The
      // provided domProps are typed for a div, so cast when handing them to Link.
      render={(domProps) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Link {...(domProps as any)} to={to} aria-label={`View food safety details: ${c.label}`} />
      )}
      className="group flex h-full flex-col gap-3 p-5 transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="text-2xl leading-none">
            {c.emoji}
          </span>
          <span className="font-semibold leading-tight">{c.label}</span>
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      {pathogens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pathogens.slice(0, 3).map((p) => (
            <Chip key={p.id} color="default" variant="soft" size="sm">
              {p.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-4 pt-1 text-sm text-muted-foreground">
        {outbreaks.length > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-[color:var(--status-critical)]">
            <Activity className="size-4" />
            {outbreaks.length} outbreak{outbreaks.length > 1 ? "s" : ""}
          </span>
        )}
        {recallCount > 0 && (
          <span className="flex items-center gap-1.5 tabular-nums">
            <FileWarning className="size-4" />
            {recallCount} recall{recallCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </Card>
  );
}
