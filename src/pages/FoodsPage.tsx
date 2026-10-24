import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { loadOutbreaks } from "@/data/outbreaksLive";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadFsisRecalls } from "@/data/fsis";
import { buildFoodIndex, currentReachCount, reachCount, foodsMatching, recallsMatching, NOT_YET_IDENTIFIED, type FoodEntry } from "@/data/foods";
import type { Outbreak, Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { FoodRow, FoodRowHeader } from "@/components/FoodRow";
import { OutbreakTile } from "@/components/OutbreakTile";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { FrontDoor } from "@/components/FrontDoor";
import { FeaturedLocal } from "@/components/FeaturedLocal";
import { useZipContext } from "@/hooks/ZipContext";
import { EmptyState, Loading, SectionHeading } from "@/components/common";
import { formatIsoShort } from "@/lib/utils";
import { CURATED_CHECKED_AT } from "@/data/outbreaks";

interface FoodsData {
  foods: FoodEntry[];
  unidentified: Outbreak[];
  recalls: Recall[];
  /** True when the live FDA feed was unavailable and the curated list stands in. */
  curated: boolean;
}

/** The one standing sentence under the headline: a product rule, not a hedge. */
const RECORD_RULE =
  "Foods appear only because an FDA, CDC, or USDA FSIS record names them; categories are for browsing, not a judgment on a whole category.";

/** Home: one answer line, the foods tied to active outbreaks beside it, then every food on the record. */
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
      curated: live.stale,
    };
  }, []);

  const stats = useMemo(() => {
    const foods = data.data?.foods ?? [];
    const identifiedOutbreaks = foods.reduce((n, f) => n + f.outbreaks.length, 0);
    return {
      foods: foods.length,
      outbreaks: identifiedOutbreaks + (data.data?.unidentified.length ?? 0),
      recalls: foods.reduce((n, f) => n + f.recallCount, 0),
      reach: geo ? foods.reduce((n, f) => n + currentReachCount(f, geo.stateAbbr), 0) : null,
    };
  }, [data.data, geo]);

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
  const tied = allFoods.filter((f) => f.outbreaks.length > 0);
  const nothingNamed = !data.loading && foods.length === 0 && unidentified.length === 0;

  return (
    <div className="space-y-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <div className="space-y-5">
            {data.loading ? (
              <h1 className="display text-4xl text-ink-2 sm:text-6xl">Checking FDA, CDC and USDA FSIS records…</h1>
            ) : (
              <h1 className="display text-4xl sm:text-6xl">
                {geo && stats.reach != null ? (
                  stats.reach > 0 ? (
                    <>
                      <span className="tnum">{stats.reach}</span> ongoing recall {stats.reach === 1 ? "notice reaches" : "notices reach"}{" "}
                      {geo.state} right now.
                    </>
                  ) : (
                    <>No ongoing recall notice from the last 90 days reaches {geo.state}.</>
                  )
                ) : (
                  <>
                    <span className="tnum">{stats.foods}</span> {stats.foods === 1 ? "food is" : "foods are"} named in current US
                    recalls and outbreaks.
                  </>
                )}
              </h1>
            )}
            {data.loading ? (
              <Loading className="h-12 justify-start">Loading FDA, CDC &amp; FSIS activity…</Loading>
            ) : (
              <p className="prose-measure text-base text-ink-2">
                <span className="tnum">{stats.outbreaks}</span> active outbreak{stats.outbreaks === 1 ? "" : "s"}
                {data.data?.curated && ` as of ${formatIsoShort(CURATED_CHECKED_AT)} (live FDA feed unavailable)`} ·{" "}
                <span className="tnum">{stats.recalls}</span> recent recall notice{stats.recalls === 1 ? "" : "s"} on record.{" "}
                {RECORD_RULE}
              </p>
            )}
          </div>

          <FrontDoor value={input} onChange={setInput} result={result} />
        </div>

        {!data.loading && !searching && (
          <section className="lg:pt-2">
            {tied.length > 0 ? (
              <>
                <h2 className="display-md text-2xl">
                  Tied to an active outbreak
                  {data.data?.curated && <span className="font-medium"> as of {formatIsoShort(CURATED_CHECKED_AT)}</span>}
                </h2>
                <ul className="mt-5 flex flex-col items-start gap-3">
                  {tied.map((f) => (
                    <li key={f.category.id} className="max-w-[30rem]">
                      <TiedFoodCapsule entry={f} state={geo?.stateAbbr} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h2 className="display-md text-2xl">No active outbreak names a food right now</h2>
                <p className="prose-measure mt-2 text-sm text-ink-2">
                  When FDA or CDC names a food in an active investigation, it appears here with its record.
                </p>
              </>
            )}

            {unidentified.length > 0 && (
              <div className={tied.length > 0 ? "mt-10" : "mt-8"}>
                <h2 className="display-md text-2xl">Not yet tied to a food</h2>
                <p className="prose-measure mt-2 text-sm text-ink-2">
                  These active investigations don't have a food pinned down yet. They're tracked by pathogen until
                  FDA names a vehicle.
                </p>
                <div className="mt-5 grid max-w-[28rem] gap-3">
                  {unidentified.map((ob) => (
                    <OutbreakTile key={ob.id} outbreak={ob} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {nothingNamed ? (
        searching ? (
          <EmptyState>
            That is not a sign the food is unaffected: records name products and firms, not every food.{" "}
            <Link className="link" to="/recalls#check">
              Check a product barcode
            </Link>
          </EmptyState>
        ) : (
          <EmptyState>No foods are named in current outbreak or recall activity right now.</EmptyState>
        )
      ) : (
        !data.loading && (
          <>
            <FeaturedLocal geo={geo} />

            {foods.length > 0 && (
              <section className="space-y-4">
                <SectionHeading count={foods.length}>
                  {searching ? "Matching foods" : "All foods named in the record"}
                </SectionHeading>
                {!geo && <p className="text-sm text-ink-2">Add a ZIP above to see how many notices reach your state.</p>}
                <div>
                  <FoodRowHeader />
                  {foods.map((f) => (
                    <FoodRow
                      key={f.category.id}
                      entry={f}
                      state={geo?.stateAbbr}
                      matched={searching ? recallsMatching([...f.fdaRecalls, ...f.fsisRecalls], query) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )
      )}
    </div>
  );
}

/** Wrap each run of digits (with its separators) in tabular numerals, nothing else. */
function tnumRuns(text: string): ReactNode {
  return text.split(/(\d{2,})/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="tnum">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

/** One food tied to an active outbreak: a capsule linking to its page. */
function TiedFoodCapsule({ entry, state }: { entry: FoodEntry; state?: string }) {
  const pathogens = [...new Set(entry.outbreaks.map((o) => o.pathogen))];
  const known = entry.outbreaks.filter((o) => o.caseCount != null);
  const cases = known.length > 0 ? known.reduce((n, o) => n + (o.caseCount ?? 0), 0) : null;
  const reach = state ? reachCount(entry, state) : null;
  const facts = [
    cases != null && `${cases.toLocaleString()} ${cases === 1 ? "case" : "cases"}`,
    `${entry.recallCount} ${entry.recallCount === 1 ? "notice" : "notices"}`,
    state && `${reach} reach ${state}`,
  ].filter(Boolean);
  return (
    <Link
      to={`/food/${entry.category.id}`}
      className="capsule min-h-14 rounded-full px-5 py-3 whitespace-normal"
    >
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-lg font-extrabold">{entry.category.label}</span>
        <span className="text-sm">{pathogens.join(", ")}</span>
        <span className="text-sm font-normal text-ink-2">{tnumRuns(facts.join(" · "))}</span>
      </span>
      <span aria-hidden className="capsule__chip" />
    </Link>
  );
}
