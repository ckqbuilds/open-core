import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { foodIcon } from "@/lib/icons";
import { reachCount, type FoodEntry } from "@/data/foods";
import type { Recall } from "@/data/types";
import { cn } from "@/lib/utils";

/** The column grid every food row shares, in every state. */
export const FOOD_GRID = "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7rem_8.5rem]";

export function FoodRowHeader() {
  return (
    <div className={cn("row-rule hidden gap-4 px-3 pb-2 text-xs font-bold text-ink-2 md:grid", FOOD_GRID)}>
      <span>Food</span>
      <span>Named with</span>
      <span className="text-right">Recalls</span>
      <span className="text-right">Reaches you</span>
    </div>
  );
}

/** One food on the list: the whole row links to its food page. */
export function FoodRow({
  entry,
  state,
  matched,
}: {
  entry: FoodEntry;
  state?: string;
  /** While searching: the recalls in this food that match the query. */
  matched?: Recall[];
}) {
  const { category: c, outbreaks, recallCount, pathogens } = entry;
  const Icon = foodIcon(c.id);
  const searching = matched !== undefined;
  const total = searching ? matched.length : recallCount;
  const view = searching ? { ...entry, fdaRecalls: matched, fsisRecalls: [] } : entry;
  const reach = state ? reachCount(view, state) : null;

  return (
    <Link
      to={`/food/${c.id}`}
      className={cn(
        "row-rule group grid gap-x-4 gap-y-1.5 rounded-md px-3 py-3.5 transition-colors hover:bg-paper md:items-center",
        FOOD_GRID
      )}
    >
      <span className="flex items-center gap-3 text-lg font-bold leading-tight">
        <Icon aria-hidden className="size-5 shrink-0 text-land-deep" />
        {c.label}
        <ArrowRight aria-hidden className="ml-auto size-4 text-ink-2 transition-transform ease-over group-hover:translate-x-1 md:hidden" />
      </span>

      <span className="flex flex-wrap items-center gap-1.5 text-sm">
        {outbreaks.length > 0 && (
          <Chip color="coral">
            {outbreaks.length === 1 ? "Active outbreak" : `${outbreaks.length} active outbreaks`}
          </Chip>
        )}
        {pathogens.slice(0, 2).map((p) => (
          <span key={p.id} className="text-ink-2">
            {p.name}
          </span>
        ))}
      </span>

      <span className="tnum text-sm md:text-right">
        <span className="font-semibold">{total}</span>
        <span className="text-ink-2"> {searching ? "match" : total === 1 ? "recall" : "recalls"}</span>
      </span>

      <span className="tnum text-sm md:text-right">
        {state ? (
          reach && reach > 0 ? (
            <span className="font-extrabold">{reach} reach {state}</span>
          ) : (
            <span className="text-ink-2">{state} not listed</span>
          )
        ) : (
          <span className="text-ink-2">add a ZIP</span>
        )}
        <ArrowRight aria-hidden className="ml-2 hidden size-4 align-[-2px] text-ink-2 transition-transform ease-over group-hover:translate-x-1 md:inline" />
      </span>
    </Link>
  );
}
