import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { loadOutbreaks, type LiveOutbreaks } from "@/data/outbreaksLive";
import { fetchRecallsByTerm } from "@/data/openfda";
import { loadFsisRecalls, correlateFsisRecalls } from "@/data/fsis";
import { PATHOGENS, matchesOutbreakPathogen } from "@/data/symptoms";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useRiskGroups } from "@/hooks/useRiskGroups";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useZipContext } from "@/hooks/ZipContext";
import { OutbreakDetail, NamedInRecord } from "@/components/OutbreakDetail";
import { OutbreakGrounding } from "@/components/OutbreakGrounding";
import { RecallRow } from "@/components/RecallRow";
import { AvoidanceDigest } from "@/components/AvoidanceDigest";
import { buildAvoidanceDigest } from "@/data/avoidance";
import { NamedLocationsMap } from "@/components/NamedLocationsMap";
import { PathogenCard } from "@/sections/SymptomsSection";
import { KeyButton } from "@/components/KeyButton";
import { Disclosure } from "@/components/Disclosure";
import { EmptyState, Loading, SectionHeading } from "@/components/common";

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
  useDocumentTitle(ob ? `${ob.pathogen} outbreak · OpenCORE` : "Outbreak · OpenCORE");

  // Only surface recalls from the last few years — an ongoing outbreak's
  // "related recalls" shouldn't dredge up terminated recalls from a decade ago.
  const recallSince = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - RELATED_RECALL_WINDOW_YEARS);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  }, []);

  // 40, not a dozen: one recall event is often filed as 20+ product records,
  // and the shelf digest needs the whole event to group it honestly.
  const relatedRecalls = useAsync<Recall[]>(
    (signal) => fetchRecallsByTerm(recallTerm, 40, signal, recallSince),
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
  const digest = useMemo(
    () => buildAvoidanceDigest([...(relatedRecalls.data ?? []), ...fsisRelated], ob?.namedEntities ?? [], matchedPathogen ? [matchedPathogen.id] : [], ob?.firstIllnessDate ?? ob?.datePosted),
    [ob?.namedEntities, ob?.firstIllnessDate, ob?.datePosted, matchedPathogen, relatedRecalls.data, fsisRelated]
  );

  const backLink = (
    <Link to="/outbreaks" className="capsule capsule--sm capsule--ghost">
      <ArrowLeft className="size-4" aria-hidden /> All outbreaks
    </Link>
  );

  if (outbreaks.loading) {
    return (
      <div className="space-y-4">
        {backLink}
        <Loading>Loading outbreak…</Loading>
      </div>
    );
  }

  if (!ob) {
    return (
      <div className="space-y-4">
        {backLink}
        <EmptyState>
          No outbreak found for reference #{refId}. It may have closed since you last opened this
          link. <Link className="link" to="/">See active outbreaks</Link>.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backLink}
        <KeyButton />
      </div>

      <OutbreakDetail outbreak={ob} symptomsHref={matchedPathogen ? "#symptoms" : undefined} />

      {/* What to avoid on the shelf — the shelf-recognition digest */}
      <AvoidanceDigest
        digest={digest}
        geo={geo}
        group={{ kind: "pathogen", label: matchedPathogen?.name ?? ob.pathogen }}
        hideRetailers
        hideStale
      />

      <NamedInRecord outbreak={ob} />

      <OutbreakGrounding outbreak={ob} pathogen={matchedPathogen} />

      {/* All related recall records (the digest above groups them by event) */}
      <Disclosure
        label={`All recall records (${(relatedRecalls.data ?? []).length + fsisRelated.length})`}
        icon={<Package aria-hidden />}
      >
        {relatedRecalls.loading ? (
          <Loading className="h-20">Searching openFDA for "{recallTerm}"…</Loading>
        ) : relatedRecalls.error ? (
          <EmptyState>Couldn't load related recalls ({relatedRecalls.error}).</EmptyState>
        ) : (relatedRecalls.data ?? []).length === 0 ? (
          <EmptyState>No recalls in the openFDA database mention "{recallTerm}" right now.</EmptyState>
        ) : (
          <div>
            {(relatedRecalls.data ?? []).slice(0, 8).map((r) => (
              <RecallRow key={r.id} recall={r} />
            ))}
          </div>
        )}

        {fsisRelated.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-extrabold">USDA FSIS — possibly related</h3>
            <p className="prose-measure mb-3 mt-1 text-sm text-ink-2">
              Meat, poultry, or egg recalls from USDA FSIS naming the same pathogen
              {matchedPathogen ? ` (${matchedPathogen.name})` : ""} within about six months of this
              investigation. Matched on pathogen and timeframe only — the agencies share no outbreak
              ID, so this is a possible connection, not a confirmed link.
            </p>
            <div>
              {fsisRelated.slice(0, 6).map((r) => (
                <RecallRow key={r.id} recall={r} />
              ))}
            </div>
          </div>
        )}
      </Disclosure>

      {matchedPathogen && (
        <section id="symptoms" className="scroll-mt-24 space-y-4">
          <SectionHeading>Recognize the illness</SectionHeading>
          <PathogenCard pathogen={matchedPathogen} selected={selected} activeOutbreaks={[]} />
        </section>
      )}

      {/* Named locations near you — scoped to THIS outbreak's entities */}
      <section className="space-y-4">
        <div className="space-y-2">
          <SectionHeading>Named locations near you</SectionHeading>
          <p className="prose-measure text-sm text-ink-2">
            Locations of the companies FDA/CDC named for this outbreak. Being listed is not a judgment
            that a location is unsafe — check the linked source and decide for yourself.
          </p>
        </div>
        <NamedLocationsMap entities={ob.namedEntities ?? []} geo={geo} />
      </section>
    </div>
  );
}
