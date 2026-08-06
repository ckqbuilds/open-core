import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Stethoscope, Package, ShoppingCart } from "lucide-react";
import { loadOutbreaks, type LiveOutbreaks } from "@/data/outbreaksLive";
import { fetchRecallsByTerm } from "@/data/openfda";
import { loadFsisRecalls, correlateFsisRecalls } from "@/data/fsis";
import { PATHOGENS, matchesOutbreakPathogen } from "@/data/symptoms";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useRiskGroups } from "@/hooks/useRiskGroups";
import { useZipContext } from "@/hooks/ZipContext";
import { OutbreakDetail } from "@/components/OutbreakDetail";
import { RecallRow } from "@/components/RecallRow";
import { AvoidanceCard } from "@/components/AvoidanceCard";
import {
  toAvoidanceItem,
  avoidanceFromEntities,
  dedupeAvoidance,
  sortAvoidance,
} from "@/data/avoidance";
import { NamedLocationsMap } from "@/components/NamedLocationsMap";
import { PathogenCard } from "@/sections/SymptomsSection";
import { EmptyState } from "@/components/common";

/** How far back "Related recalls" reaches. Older recalls are treated as stale. */
const RELATED_RECALL_WINDOW_YEARS = 3;

export function OutbreakPage() {
  const { refId } = useParams<{ refId: string }>();
  const { geo } = useZipContext();
  const { selected } = useRiskGroups();

  const outbreaks = useAsync<LiveOutbreaks>((signal) => loadOutbreaks(signal), []);
  const ob = useMemo(
    () => (outbreaks.data?.outbreaks ?? []).find((o) => (o.refId ?? o.id) === refId) ?? null,
    [outbreaks.data, refId]
  );

  // Matching CDC pathogen card + the best search term for related recalls.
  const matchedPathogen = useMemo(
    () => (ob ? PATHOGENS.find((p) => matchesOutbreakPathogen(p, ob.pathogen)) ?? null : null),
    [ob]
  );
  const recallTerm = ob
    ? matchedPathogen?.matchTerms[0] ?? ob.pathogen.split(/[\s,]/)[0]
    : "";

  // Only surface recalls from the last few years — an ongoing outbreak's
  // "related recalls" shouldn't dredge up terminated recalls from a decade ago.
  const recallSince = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - RELATED_RECALL_WINDOW_YEARS);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  }, []);

  const relatedRecalls = useAsync<Recall[]>(
    (signal) => fetchRecallsByTerm(recallTerm, 12, signal, recallSince),
    [recallTerm, recallSince],
    Boolean(recallTerm)
  );

  // USDA FSIS meat/poultry recalls of the same pathogen, within ~6 months of this
  // outbreak's posting — surfaced as "possibly related", not a confirmed link.
  const fsis = useAsync<Recall[]>(
    async (signal) => (await loadFsisRecalls(signal)).recalls,
    []
  );
  const fsisRelated = useMemo(
    () => correlateFsisRecalls(fsis.data ?? [], matchedPathogen?.id ?? null, ob?.datePosted ?? null),
    [fsis.data, matchedPathogen, ob?.datePosted]
  );

  // Shelf-recognition digest for this outbreak: curated named-entity brands +
  // the related recall records. Named sources only — no supply-chain inference.
  const avoidance = useMemo(() => {
    const entityItems = avoidanceFromEntities(ob?.namedEntities ?? []);
    const recallItems = [...(relatedRecalls.data ?? []), ...fsisRelated].map(toAvoidanceItem);
    return sortAvoidance(dedupeAvoidance([...entityItems, ...recallItems]));
  }, [ob?.namedEntities, relatedRecalls.data, fsisRelated]);

  const backLink = (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> All outbreaks
    </Link>
  );

  if (outbreaks.loading) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Loading outbreak…
        </div>
      </div>
    );
  }

  if (!ob) {
    return (
      <div className="space-y-4">
        {backLink}
        <EmptyState>
          No outbreak found for reference #{refId}. It may have closed since you last opened this
          link. <Link className="text-primary hover:underline" to="/">See active outbreaks</Link>.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {backLink}

      <OutbreakDetail outbreak={ob} />

      {/* What to avoid on the shelf — the shelf-recognition digest */}
      {avoidance.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-[color:var(--status-critical)]" />
            <h2 className="text-lg font-semibold">What to avoid on the shelf</h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Pulled from the official recall notice — the brands and package codes to check. Being
            listed means the product is under recall, not that a store is unsafe.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {avoidance.map((item) => (
              <AvoidanceCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
      {/* Related recalls for this pathogen */}
      <section className="lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Related recalls</h2>
        </div>
        {relatedRecalls.loading ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Searching openFDA for "{recallTerm}"…
          </div>
        ) : relatedRecalls.error ? (
          <EmptyState>Couldn't load related recalls ({relatedRecalls.error}).</EmptyState>
        ) : (relatedRecalls.data ?? []).length === 0 ? (
          <EmptyState>No recalls in the openFDA database mention "{recallTerm}" right now.</EmptyState>
        ) : (
          <div className="space-y-3">
            {(relatedRecalls.data ?? []).slice(0, 8).map((r) => (
              <RecallRow key={r.id} recall={r} />
            ))}
          </div>
        )}

        {fsisRelated.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">USDA FSIS — possibly related</h3>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Meat, poultry, or egg recalls from USDA FSIS naming the same pathogen
              {matchedPathogen ? ` (${matchedPathogen.name})` : ""} within about six months of this
              investigation. Matched on pathogen and timeframe only — the agencies share no outbreak
              ID, so this is a possible connection, not a confirmed link.
            </p>
            <div className="space-y-3">
              {fsisRelated.slice(0, 6).map((r) => (
                <RecallRow key={r.id} recall={r} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Recognize the illness — matched CDC symptom card */}
      {matchedPathogen && (
        <section className="lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Stethoscope className="size-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recognize the illness</h2>
          </div>
          <PathogenCard pathogen={matchedPathogen} selected={selected} activeOutbreaks={[]} />
        </section>
      )}
      </div>

      {/* Named locations near you — scoped to THIS outbreak's entities */}
      <section>
        <div className="mb-1 flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Named locations near you</h2>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Locations of the companies FDA/CDC named for this outbreak. Being listed is not a judgment
          that a location is unsafe — check the linked source and decide for yourself.
        </p>
        <NamedLocationsMap entities={ob.namedEntities ?? []} geo={geo} />
      </section>
    </div>
  );
}
