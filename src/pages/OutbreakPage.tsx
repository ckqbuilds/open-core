import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Stethoscope, Package } from "lucide-react";
import { loadOutbreaks, type LiveOutbreaks } from "@/data/outbreaksLive";
import { fetchRecallsByTerm } from "@/data/openfda";
import { PATHOGENS, matchesOutbreakPathogen } from "@/data/symptoms";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useRiskGroups } from "@/hooks/useRiskGroups";
import { useZipContext } from "@/hooks/ZipContext";
import { OutbreakDetail } from "@/components/OutbreakDetail";
import { RecallRow } from "@/components/RecallRow";
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

      {/* Related recalls for this pathogen */}
      <section>
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
      </section>

      {/* Recognize the illness — matched CDC symptom card */}
      {matchedPathogen && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Stethoscope className="size-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recognize the illness</h2>
          </div>
          <div className="max-w-2xl">
            <PathogenCard pathogen={matchedPathogen} selected={selected} activeOutbreaks={[]} />
          </div>
        </section>
      )}

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
