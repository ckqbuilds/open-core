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
import { matchesOutbreakPathogen, PATHOGENS } from "@/data/symptoms";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useZipContext } from "@/hooks/ZipContext";
import { useRiskGroups } from "@/hooks/useRiskGroups";
import { OutbreakTile } from "@/components/OutbreakTile";
import { RecallRow } from "@/components/RecallRow";
import { AvoidanceDigest } from "@/components/AvoidanceDigest";
import { buildAvoidanceDigest } from "@/data/avoidance";
import { NamedLocationsMap } from "@/components/NamedLocationsMap";
import { PathogenCard } from "@/sections/SymptomsSection";
import { foodIcon } from "@/lib/icons";
import { Disclosure } from "@/components/Disclosure";
import { KeyButton } from "@/components/KeyButton";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { EmptyState, InfoNote } from "@/components/common";

const RECALL_WINDOW_YEARS = 3;
/**
 * openFDA's per-request maximum. Keep this high: a lower cap silently truncates
 * the digest, so the same recall event would show fewer notices here than on
 * its outbreak page. The page recomputes every count from this one fetched set
 * (the "All recall records" total and the digest), so the page agrees with
 * itself. The home tile counts a different query (the 250 most recent relevant
 * records, bucketed by description), so before this page loads the tile can
 * differ from the total shown here.
 */
const FOOD_RECALL_LIMIT = 100;
const nextStepLink =
  "inline-flex min-h-11 items-center rounded-md border border-input px-3 font-medium text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function recallDate(r: Recall): string {
  return r.reportDate ?? r.recallInitiationDate ?? "";
}

export function FoodPage() {
  const { foodId } = useParams<{ foodId: string }>();
  const { geo } = useZipContext();
  const { selected } = useRiskGroups();
  const category = foodId ? foodById(foodId) : undefined;
  useDocumentTitle(category ? `${category.label} · OpenCORE` : "Food · OpenCORE");

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
        fetchRecallsByFood(cat.matchTerms, FOOD_RECALL_LIMIT, signal, recallSince).catch(() => [] as Recall[]),
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
      // Same bucketing the home index uses (by product description), so a
      // broad match-term hit that belongs to another food is not counted here.
      const fdaRecalls = fda.filter((r) => (categorizeFood(r.productDescription) ?? OTHER_FOOD).id === cat.id);
      return assembleFoodEntry(cat, outbreaks, fdaRecalls, fsisRecalls);
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

  // Shelf-recognition digest: what to check for at the store, built from the
  // official recall records + the curated named entities for this food. Named
  // sources only — nothing inferred. Grouped by recall event.
  const outbreakStart = useMemo(() => {
    const starts = (entry?.outbreaks ?? [])
      .map((o) => o.firstIllnessDate ?? o.datePosted)
      .filter((d): d is string => !!d)
      .sort();
    return starts[0] ?? null;
  }, [entry]);
  const digest = useMemo(
    () =>
      buildAvoidanceDigest(
        entry ? [...entry.fdaRecalls, ...entry.fsisRecalls] : [],
        entry?.namedEntities ?? [],
        PATHOGENS.filter((p) => entry?.outbreaks.some((o) => matchesOutbreakPathogen(p, o.pathogen))).map(
          (p) => p.id
        ),
        outbreakStart,
        category?.matchTerms ?? []
      ),
    [entry, outbreakStart, category]
  );

  const backLink = (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground pointer-coarse:min-h-11"
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
        icon={<span aria-hidden className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent">{(() => { const Icon = foodIcon(category.id); return <Icon className="size-5" />; })()}</span>}
        title={category.label}
        description="Everything on record for this food in the last 3 years, across FDA, CDC, and USDA FSIS. Home counts only the most recent records; this page lists them all."
        actions={<KeyButton />}
      />

      <div className="-mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
        <span>If you have this food:</span>
        <Link to="/recalls#check" className={nextStepLink}>
          Check the product barcode
        </Link>
        <span className="hidden sm:inline" aria-hidden>·</span>
        <span className="sm:sr-only">If you feel sick:</span>
        <a
          href="#if-sick"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("if-sick")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={nextStepLink}
        >
          See what to do
        </a>
      </div>

      {data.loading ? (
        <div role="status" className="flex h-40 items-center justify-center gap-3 text-sm text-muted-foreground">
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
          {/* What to avoid on the shelf — the shelf-recognition digest */}
          <AvoidanceDigest digest={digest} geo={geo} group={{ kind: "food", label: category.label.toLowerCase() }} />

          {/* Coordinated recalls across FDA + USDA FSIS */}
          {recalls.length > 0 && (
            <Disclosure
              label={`All recall notices (${recalls.length})`}
              icon={<Package className="size-4 text-muted-foreground" />}
              description="open + related-word + closed"
            >
              <p className="mb-3 max-w-prose text-sm text-muted-foreground">
                FDA (openFDA) and USDA FSIS regulate different foods, so a food's recalls can come
                from either agency. CDC leads the outbreak investigations shown above — it does not
                issue recalls.
              </p>
              <div className="space-y-3">
                {recalls.slice(0, 12).map((r) => (
                  <RecallRow key={r.id} recall={r} />
                ))}
              </div>
              {recalls.length > 12 && (
                <p className="pt-3 text-xs text-muted-foreground">
                  Showing the 12 most recent of {recalls.length}.{" "}
                  <Link className="text-primary hover:underline" to="/recalls">
                    Browse all recalls
                  </Link>
                </p>
              )}
            </Disclosure>
          )}

          {/* Named suppliers & locations near you */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Named suppliers &amp; locations near you</h2>
            </div>
            {entry && entry.namedEntities.length > 0 ? (
              <>
                <p className="max-w-prose text-sm text-muted-foreground">
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
            <section id="if-sick" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">What to do if you're sick</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Pregnant, older, young, or immunocompromised?{" "}
                <Link
                  to="/learn#risk-groups"
                  className="inline-flex items-center rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
                >
                  See risk-group guidance
                </Link>
              </p>
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
