import { useEffect, useMemo, useState } from "react";
import { Utensils, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { loadOutbreaks } from "@/data/outbreaksLive";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadFsisRecalls } from "@/data/fsis";
import { buildFoodIndex, foodsMatching, recallsMatching, NOT_YET_IDENTIFIED, type FoodEntry } from "@/data/foods";
import type { Outbreak, Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { FoodTile } from "@/components/FoodTile";
import { OutbreakTile } from "@/components/OutbreakTile";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { FrontDoor } from "@/components/FrontDoor";
import { FeaturedLocal } from "@/components/FeaturedLocal";
import { useZipContext } from "@/hooks/ZipContext";
import { EmptyState, InfoNote } from "@/components/common";

interface FoodsData {
  foods: FoodEntry[];
  unidentified: Outbreak[];
  recalls: Recall[];
}

/** Home: affected foods, grouped into commodity categories, each tile linking out. */
export function FoodsPage() {
  useDocumentTitle("OpenCORE — What's affected right now");
  const { geo } = useZipContext();
  const data = useAsync<FoodsData>(async (signal) => {
    const [live, fda, fsis] = await Promise.all([
      loadOutbreaks(signal),
      fetchRelevantRecalls(250, signal).catch(() => []),
      loadFsisRecalls(signal).catch(() => ({ recalls: [] as never[], generatedAt: null, stale: true })),
    ]);
    const outbreaks = live.outbreaks;
    return {
      recalls: [...fda, ...fsis.recalls],
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

  const allFoods = data.data?.foods ?? [];
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [input]);
  const searching = query.length >= 2;
  const foods = useMemo(() => (searching ? foodsMatching(allFoods, query) : allFoods), [allFoods, query, searching]);
  const result = useMemo(
    () =>
      searching
        ? { query, foods: foods.length, recalls: recallsMatching(data.data?.recalls ?? [], query).length }
        : null,
    [searching, query, foods, data.data]
  );
  const unidentified = data.data?.unidentified ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Utensils className="size-6 text-primary" />}
        title="What's affected right now"
        description="Foods named in current FDA, CDC, and USDA FSIS activity, grouped by commodity. Pick a food to see the active outbreaks, the recalls across all three agencies, the companies named in the record, locations near you, and what to do if you're sick."
      />

      <FrontDoor value={input} onChange={setInput} result={result} />

      {data.loading ? (
        <div role="status" className="flex h-40 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Spinner size="lg" /> Loading FDA, CDC &amp; FSIS activity…
        </div>
      ) : foods.length === 0 && unidentified.length === 0 ? (
        searching ? (
          <EmptyState>
            No food or recall record mentions &ldquo;{query}&rdquo;. That is not a sign the food is
            unaffected: records name products and firms, not every food.{" "}
            <Link className="text-primary hover:underline" to="/recalls#check">
              Check a product barcode
            </Link>
          </EmptyState>
        ) : (
          <EmptyState>No foods are named in current outbreak or recall activity right now.</EmptyState>
        )
      ) : (
        <>
          <FeaturedLocal geo={geo} />

          <p className="text-sm text-muted-foreground tabular-nums">
            {stats.foods} foods · {stats.outbreaks} active outbreak{stats.outbreaks === 1 ? "" : "s"} ·{" "}
            {stats.recalls} recalls on record (3 years)
          </p>

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
              <p className="max-w-prose text-sm text-muted-foreground">
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
