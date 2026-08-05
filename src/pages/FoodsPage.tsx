import { useMemo } from "react";
import { Utensils, Activity, FileWarning, Search } from "lucide-react";
import { Spinner } from "@heroui/react";
import { loadOutbreaks } from "@/data/outbreaksLive";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadFsisRecalls } from "@/data/fsis";
import { buildFoodIndex, NOT_YET_IDENTIFIED, type FoodEntry } from "@/data/foods";
import type { Outbreak } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { FoodTile } from "@/components/FoodTile";
import { OutbreakTile } from "@/components/OutbreakTile";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState, InfoNote } from "@/components/common";

interface FoodsData {
  foods: FoodEntry[];
  unidentified: Outbreak[];
}

/** Home: affected foods, grouped into commodity categories, each tile linking out. */
export function FoodsPage() {
  const data = useAsync<FoodsData>(async (signal) => {
    const [live, fda, fsis] = await Promise.all([
      loadOutbreaks(signal),
      fetchRelevantRecalls(250, signal).catch(() => []),
      loadFsisRecalls(signal).catch(() => ({ recalls: [] as never[], generatedAt: null, stale: true })),
    ]);
    const outbreaks = live.outbreaks;
    return {
      foods: buildFoodIndex(outbreaks, fda, fsis.recalls),
      unidentified: outbreaks.filter(
        (o) => o.status === "active" && o.vehicle === NOT_YET_IDENTIFIED
      ),
    };
  }, []);

  const stats = useMemo(() => {
    const foods = data.data?.foods ?? [];
    const identifiedOutbreaks = foods.reduce((n, f) => n + f.outbreaks.length, 0);
    return {
      foods: foods.length,
      outbreaks: identifiedOutbreaks + (data.data?.unidentified.length ?? 0),
      recalls: foods.reduce((n, f) => n + f.recallCount, 0),
    };
  }, [data.data]);

  const foods = data.data?.foods ?? [];
  const unidentified = data.data?.unidentified ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Utensils className="size-6 text-primary" />}
        title="What's affected right now"
        description="Foods named in current FDA, CDC, and USDA FSIS activity, grouped by commodity. Pick a food to see the active outbreaks, the recalls across all three agencies, the companies named in the record, locations near you, and what to do if you're sick."
      />

      {data.loading ? (
        <div className="flex h-40 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Spinner size="lg" /> Loading FDA, CDC &amp; FSIS activity…
        </div>
      ) : foods.length === 0 && unidentified.length === 0 ? (
        <EmptyState>No foods are named in current outbreak or recall activity right now.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Foods affected"
              value={stats.foods}
              icon={<Utensils className="size-4" />}
              tone="accent"
            />
            <StatCard
              label="Active outbreaks"
              value={stats.outbreaks}
              icon={<Activity className="size-4" />}
              tone="critical"
            />
            <StatCard
              label="Open recalls"
              value={stats.recalls}
              icon={<FileWarning className="size-4" />}
              hint="last 3 years, across FDA + FSIS"
            />
          </div>

          <InfoNote>
            Foods appear here only because a real FDA, CDC, or USDA FSIS record names them. Grouping
            into categories is for browsing — it is not a judgment that a whole category is unsafe.
          </InfoNote>

          {foods.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {foods.map((f) => (
                <FoodTile key={f.category.id} entry={f} />
              ))}
            </div>
          )}

          {unidentified.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Search className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Food not yet identified</h2>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                These active investigations don't have a food pinned down yet. They're tracked by
                pathogen until FDA names a vehicle.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unidentified.map((ob) => (
                  <OutbreakTile key={ob.id} outbreak={ob} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
