import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
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
import { OutbreakRow, OutbreakRowHeader } from "@/components/OutbreakTile";
import { RecallRow } from "@/components/RecallRow";
import { AvoidanceDigest } from "@/components/AvoidanceDigest";
import { buildAvoidanceDigest } from "@/data/avoidance";
import { NamedLocationsMap } from "@/components/NamedLocationsMap";
import { PathogenCard } from "@/sections/SymptomsSection";
import { Disclosure } from "@/components/Disclosure";
import { KeyButton } from "@/components/KeyButton";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { EmptyState, InfoNote, Loading, SectionHeading } from "@/components/common";

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
    <Link to="/" className="capsule capsule--sm capsule--ghost">
      <ArrowLeft className="size-4" aria-hidden /> All foods
    </Link>
  );

  if (!category) {
    return (
      <div className="space-y-4">
        {backLink}
        <EmptyState>
          Unknown food category. <Link className="link" to="/">See all foods</Link>.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {backLink}

      <PageHeader
        title={category.label}
        description="Everything on record for this food in the last 3 years, across FDA, CDC, and USDA FSIS. Home counts only the most recent records; this page lists them all."
        actions={<KeyButton />}
      />

      <div className="-mt-4 flex flex-col gap-3 text-sm text-ink-2 sm:flex-row sm:flex-wrap sm:items-center">
        <span>If you have this food:</span>
        <Link to="/recalls#check" className="capsule capsule--sun">
          Check the product barcode
        </Link>
        <span className="sm:sr-only">If you feel sick:</span>
        <a
          href="#if-sick"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("if-sick")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="capsule"
        >
          See what to do
        </a>
      </div>

      {data.loading ? (
        <Loading className="h-32">Loading {category.label.toLowerCase()} activity…</Loading>
      ) : entry && entry.outbreaks.length === 0 && recalls.length === 0 ? (
        <EmptyState>
          No current outbreak or recall activity for {category.label.toLowerCase()} in the tracked
          data.
        </EmptyState>
      ) : (
        <>
          {/* Active outbreaks for this food */}
          {entry && entry.outbreaks.length > 0 && (
            <section className="space-y-4">
              <SectionHeading count={entry.outbreaks.length}>Active outbreaks</SectionHeading>
              <div>
                <OutbreakRowHeader />
                {entry.outbreaks.map((ob) => (
                  <OutbreakRow key={ob.id} outbreak={ob} />
                ))}
              </div>
            </section>
          )}
          {/* What to avoid on the shelf — the shelf-recognition digest */}
          <AvoidanceDigest digest={digest} geo={geo} group={{ kind: "food", label: category.label.toLowerCase() }} />

          {/* Coordinated recalls across FDA + USDA FSIS */}
          {recalls.length > 0 && (
            <Disclosure
              label={`All recall records (${recalls.length})`}
              icon={<Package aria-hidden />}
              description="open + related-word + closed"
            >
              <p className="prose-measure mb-3 text-sm text-ink-2">
                FDA (openFDA) and USDA FSIS regulate different foods, so a food's recalls can come
                from either agency. CDC leads the outbreak investigations shown above — it does not
                issue recalls.
              </p>
              <div>
                {recalls.slice(0, 12).map((r) => (
                  <RecallRow key={r.id} recall={r} />
                ))}
              </div>
              {recalls.length > 12 && (
                <p className="pt-3 text-sm text-ink-2">
                  Showing the 12 most recent of {recalls.length}.{" "}
                  <Link className="link" to="/recalls">
                    Browse all recalls
                  </Link>
                </p>
              )}
            </Disclosure>
          )}

          {/* Named suppliers & locations near you */}
          <section className="space-y-4">
            <SectionHeading>Named suppliers &amp; locations near you</SectionHeading>
            {entry && entry.namedEntities.length > 0 ? (
              <>
                <p className="prose-measure text-sm text-ink-2">
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
            <section id="if-sick" className="scroll-mt-24 space-y-4">
              <SectionHeading>What to do if you're sick</SectionHeading>
              <p className="prose-measure text-sm text-ink-2">
                Pregnant, older, young, or immunocompromised?{" "}
                <Link to="/learn#risk-groups" className="link inline-flex items-center pointer-coarse:min-h-11">
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
