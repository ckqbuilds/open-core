import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { loadOutbreaks } from "@/data/outbreaksLive";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadFsisRecalls } from "@/data/fsis";
import { buildFoodIndex, reachCount, foodsMatching, recallsMatching, NOT_YET_IDENTIFIED, type FoodEntry } from "@/data/foods";
import type { Outbreak, Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { FoodRow, FoodRowHeader } from "@/components/FoodRow";
import { OutbreakTile } from "@/components/OutbreakTile";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { FrontDoor } from "@/components/FrontDoor";
import { FeaturedLocal } from "@/components/FeaturedLocal";
import { useZipContext } from "@/hooks/ZipContext";
import { EmptyState, Loading, Lobe, SectionHeading } from "@/components/common";

interface FoodsData {
  foods: FoodEntry[];
  unidentified: Outbreak[];
  recalls: Recall[];
}

/** The one standing sentence under the headline: a product rule, not a hedge. */
const RECORD_RULE =
  "Foods appear only because an FDA, CDC, or USDA FSIS record names them; categories are for browsing, not a judgment on a whole category.";

/** The lobe that bleeds past the right and top edges of the page on wide screens. */
const LOBE_BLEED =
  "lobe--soft p-6 sm:p-8 lg:pl-28 lg:pt-16 lg:-mt-10 lg:[border-radius:48%_0_0_55%/55%_0_0_45%] lg:-mr-[max(1.25rem,calc((100vw-1240px)/2+1.25rem))] lg:pr-[max(2rem,calc((100vw-1240px)/2+2rem))]";

/** Home: one answer line, the foods tied to active outbreaks in the lobe, then every food on the record. */
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
      reach: geo ? foods.reduce((n, f) => n + reachCount(f, geo.stateAbbr), 0) : null,
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
                      <span className="tnum">{stats.reach}</span> {stats.reach === 1 ? "recall reaches" : "recalls reach"}{" "}
                      {geo.state} right now.
                    </>
                  ) : (
                    <>No recalls on record list {geo.state} right now.</>
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
                <span className="tnum">{stats.outbreaks}</span> active outbreak{stats.outbreaks === 1 ? "" : "s"} ·{" "}
                <span className="tnum">{stats.recalls}</span> recent recall{stats.recalls === 1 ? "" : "s"} on record.{" "}
                {RECORD_RULE}
              </p>
            )}
          </div>

          <FrontDoor value={input} onChange={setInput} result={result} />
        </div>

        {!data.loading && !searching && (
          <Lobe className={LOBE_BLEED}>
            {tied.length > 0 ? (
              <>
                <h2 className="display-md text-2xl">Tied to an active outbreak</h2>
                <ul className="mt-5 flex max-w-[28rem] flex-col gap-3">
                  {tied.map((f) => (
                    <li key={f.category.id}>
                      <TiedFoodSheet entry={f} state={geo?.stateAbbr} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h2 className="display-md text-2xl">No active outbreak names a food right now</h2>
                <p className="prose-measure mt-2 text-sm">
                  When FDA or CDC names a food in an active investigation, it appears here with its record.
                </p>
              </>
            )}

            {unidentified.length > 0 && (
              <div className={tied.length > 0 ? "mt-10" : "mt-8"}>
                <h2 className="display-md text-2xl">Not yet tied to a food</h2>
                <p className="prose-measure mt-2 text-sm">
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
          </Lobe>
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

/** One food pinned to the lobe's coast: the whole sheet links to its page. */
function TiedFoodSheet({ entry, state }: { entry: FoodEntry; state?: string }) {
  const pathogens = [...new Set(entry.outbreaks.map((o) => o.pathogen))];
  const known = entry.outbreaks.filter((o) => o.caseCount != null);
  const cases = known.length > 0 ? known.reduce((n, o) => n + (o.caseCount ?? 0), 0) : null;
  const reach = state ? reachCount(entry, state) : null;
  const facts = [
    cases != null && `${cases.toLocaleString()} ${cases === 1 ? "case" : "cases"}`,
    `${entry.recallCount} ${entry.recallCount === 1 ? "recall" : "recalls"}`,
    state && `${reach} reach ${state}`,
  ].filter(Boolean);
  return (
    <Link to={`/food/${entry.category.id}`} className="sheet group block p-4">
      <span className="flex items-center justify-between gap-3">
        <span className="display-md text-xl">{entry.category.label}</span>
        <ArrowRight aria-hidden className="size-5 shrink-0 transition-transform ease-over group-hover:translate-x-1" />
      </span>
      <span className="mt-1.5 block text-sm">{pathogens.join(", ")}</span>
      <span className="mt-1 block text-sm text-ink-2">{facts.join(" · ")}</span>
    </Link>
  );
}
