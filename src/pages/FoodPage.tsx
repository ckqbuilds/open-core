import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Activity, Package, Stethoscope, MapPin, Loader2 } from "lucide-react";
import { loadOutbreaks } from "@/data/outbreaksLive";
import { fetchRecallsByFood } from "@/data/openfda";
import { loadFsisRecalls } from "@/data/fsis";
import {
  foodById,
  categorizeFood,
  assembleFoodEntry,
  OTHER_FOOD,
  NOT_YET_IDENTIFIED,
  type FoodEntry,
} from "@/data/foods";
import { matchesOutbreakPathogen } from "@/data/symptoms";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useZipContext } from "@/hooks/ZipContext";
import { useRiskGroups } from "@/hooks/useRiskGroups";
import { OutbreakTile } from "@/components/OutbreakTile";
import { RecallRow } from "@/components/RecallRow";
import { NamedLocationsMap } from "@/components/NamedLocationsMap";
import { PathogenCard } from "@/sections/SymptomsSection";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, InfoNote } from "@/components/common";

const RECALL_WINDOW_YEARS = 3;

function recallDate(r: Recall): string {
  return r.reportDate ?? r.recallInitiationDate ?? "";
}

export function FoodPage() {
  const { foodId } = useParams<{ foodId: string }>();
  const { geo } = useZipContext();
  const { selected } = useRiskGroups();
  const category = foodId ? foodById(foodId) : undefined;

  const recallSince = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - RECALL_WINDOW_YEARS);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  }, []);

  const data = useAsync<FoodEntry>(
    async (signal) => {
      const cat = category!;
      const [live, fda, fsis] = await Promise.all([
        loadOutbreaks(signal),
        fetchRecallsByFood(cat.matchTerms, 24, signal, recallSince).catch(() => [] as Recall[]),
        loadFsisRecalls(signal).catch(() => ({ recalls: [] as Recall[], generatedAt: null, stale: true })),
      ]);
      const outbreaks = live.outbreaks.filter(
        (o) =>
          o.status === "active" &&
          o.vehicle !== NOT_YET_IDENTIFIED &&
          (categorizeFood(o.vehicle) ?? OTHER_FOOD).id === cat.id
      );
      const fsisRecalls = fsis.recalls.filter(
        (r) => (categorizeFood(r.productDescription) ?? OTHER_FOOD).id === cat.id
      );
      return assembleFoodEntry(cat, outbreaks, fda, fsisRecalls);
    },
    [category?.id, recallSince],
    Boolean(category)
  );

  const entry = data.data;
  const recalls = useMemo(() => {
    if (!entry) return [];
    return [...entry.fdaRecalls, ...entry.fsisRecalls].sort((a, b) =>
      recallDate(b).localeCompare(recallDate(a))
    );
  }, [entry]);

  const backLink = (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> All foods
    </Link>
  );

  if (!category) {
    return (
      <div className="space-y-4">
        {backLink}
        <EmptyState>
          Unknown food category. <Link className="text-primary hover:underline" to="/">See all foods</Link>.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {backLink}

      <PageHeader
        icon={<span aria-hidden className="text-3xl leading-none">{category.emoji}</span>}
        eyebrow="Food safety"
        title={category.label}
        description="Everything the app is tracking for this food, across FDA, CDC, and USDA FSIS."
      />

      {data.loading ? (
        <div className="flex h-40 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading {category.label.toLowerCase()} activity…
        </div>
      ) : entry && entry.outbreaks.length === 0 && recalls.length === 0 ? (
        <EmptyState>
          No current outbreak or recall activity for {category.label.toLowerCase()} in the tracked
          data.
        </EmptyState>
      ) : (
        <>
          {/* Active outbreaks for this food */}
          {entry && entry.outbreaks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-[color:var(--status-critical)]" />
                <h2 className="text-lg font-semibold">Active outbreaks</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {entry.outbreaks.map((ob) => (
                  <OutbreakTile key={ob.id} outbreak={ob} />
                ))}
              </div>
            </section>
          )}

          {/* Coordinated recalls across FDA + USDA FSIS */}
          {recalls.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Recalls across FDA &amp; USDA FSIS</h2>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                FDA (openFDA) and USDA FSIS regulate different foods, so a food's recalls can come
                from either agency. CDC leads the outbreak investigations shown above — it does not
                issue recalls.
              </p>
              <div className="space-y-3">
                {recalls.slice(0, 12).map((r) => (
                  <RecallRow key={r.id} recall={r} />
                ))}
              </div>
            </section>
          )}

          {/* Named suppliers & locations near you */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Named suppliers &amp; locations near you</h2>
            </div>
            {entry && entry.namedEntities.length > 0 ? (
              <>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Companies FDA or CDC named in the record for this food. Being listed is not a
                  judgment that a location is unsafe — check the linked source and decide for
                  yourself.
                </p>
                <NamedLocationsMap entities={entry.namedEntities} geo={geo} />
              </>
            ) : (
              <InfoNote>
                No named-and-mappable brands for this food yet. Suppliers appear here only when FDA or
                CDC name a specific company with a branded product; the recalls above still list each
                recalling firm.
              </InfoNote>
            )}
          </section>

          {/* What to do if infected */}
          {entry && entry.pathogens.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">What to do if you're sick</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {entry.pathogens.map((p) => (
                  <PathogenCard
                    key={p.id}
                    pathogen={p}
                    selected={selected}
                    activeOutbreaks={entry.outbreaks.filter((o) => matchesOutbreakPathogen(p, o.pathogen))}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
