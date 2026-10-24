import { Link } from "react-router-dom";
import { ChevronRight, Activity, FileWarning } from "lucide-react";
import { Card } from "@heroui/react";
import { Chip } from "@/components/ui/chip";
import { foodIcon } from "@/lib/icons";
import { reachCount, type FoodEntry } from "@/data/foods";
import type { Recall } from "@/data/types";

/** Compact food-category summary — the whole HeroUI card links to its food page. */
export function FoodTile({ entry, state, matched }: { entry: FoodEntry; state?: string; /** While searching: the recalls in this food that match the query. */ matched?: Recall[] }) {
  const { category: c, outbreaks, recallCount, pathogens } = entry;
  const to = `/food/${c.id}`;
  const Icon = foodIcon(c.id);

  return (
    <Card
      // Card defaults to a <div>; render its root as the router Link. The
      // provided domProps are typed for a div, so cast when handing them to Link.
      render={(domProps) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Link {...(domProps as any)} to={to} />
      )}
      className="group flex h-full flex-col gap-3 p-5 transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="size-5" />
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
        {(() => {
          const searching = matched !== undefined;
          const total = searching ? matched.length : recallCount;
          if (total === 0) return null;
          const view = searching ? { ...entry, fdaRecalls: matched, fsisRecalls: [] } : entry;
          const n = state ? reachCount(view, state) : 0;
          if (state && n > 0) {
            return (
              <span className="flex items-center gap-1.5 font-medium tabular-nums text-foreground">
                <FileWarning className="size-4" />
                {searching ? `${total} match · ${n} of those reach ${state}` : `${n} reach ${state}`}
              </span>
            );
          }
          if (state) {
            return (
              <span className="flex items-center gap-1.5 tabular-nums">
                <FileWarning className="size-4" />
                {searching ? `${total} match · none listed for ${state}` : `None listed for ${state}`}
              </span>
            );
          }
          return (
            <span className="flex items-center gap-1.5 tabular-nums">
              <FileWarning className="size-4" />
              {searching ? `${total} match` : `${total} recall${total > 1 ? "s" : ""}`}
            </span>
          );
        })()}
      </div>
    </Card>
  );
}
