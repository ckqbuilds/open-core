import { useMemo } from "react";
import { Search } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Lobe } from "@/components/common";
import { RecordLine } from "@/components/RecordLine";
import { HazardChip, PlantNumbers, RecallBrief } from "@/components/SupplyParts";
import { classificationChip, statusChip } from "@/lib/classification";
import { formatFdaDate } from "@/lib/utils";
import type { Recall } from "@/data/types";
import {
  NODES,
  exactBrand,
  findPlant,
  groupMatches,
  possessive,
  type ShelfGroup,
} from "@/data/supplyChain";

const TRY = ["Jimmy Dean", "Great Value", "Boar's Head", "47991"];

/**
 * The in-store check: type a brand, company, store or the plant number from the
 * USDA stamp, and the answer comes first: who made it, the supplier's plant
 * numbers, and what else came from the same place. The page owns the query,
 * because the supplier map below draws whatever is searched here.
 */
export function AisleCheck({
  query,
  onQuery,
  groups,
  fsis,
  onTrace,
}: {
  query: string;
  onQuery: (q: string) => void;
  groups: ShelfGroup[];
  fsis: Recall[];
  onTrace: (nodeId: string) => void;
}) {
  const setQuery = onQuery;
  const hits = useMemo(() => (query.trim() ? groups.filter((g) => groupMatches(g, query)) : []), [groups, query]);
  const exact = useMemo(() => exactBrand(hits, query), [hits, query]);
  // Plant numbers also match across the whole FSIS feed, beyond the traced examples.
  const traced = useMemo(() => new Set(groups.map((g) => g.recall.fsisNumber).filter(Boolean)), [groups]);
  const plantHits = useMemo(() => findPlant(query, fsis).filter((h) => !traced.has(h.recall.recallNumber)), [query, fsis, traced]);
  const total = hits.length + plantHits.length;

  const brandChip = (b: string) => (
    <button key={b} type="button" className="chip chip--outline cursor-pointer" onClick={() => setQuery(b)} title="Map this brand">
      {b}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label htmlFor="aisle-q" className="field max-w-xl gap-2.5">
          <Search aria-hidden className="size-4 shrink-0 text-ink-2" />
          <span className="sr-only">Brand, company, store or USDA plant number</span>
          <input
            id="aisle-q"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Brand, company, store or plant number"
            className="min-w-0 flex-1 bg-transparent focus:outline-none focus-visible:shadow-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          Try
          {TRY.map((t) => (
            <button key={t} type="button" onClick={() => setQuery(t)} className="capsule capsule--sm" aria-pressed={query === t}>
              {/^\d+$/.test(t) ? `EST. ${t}` : t}
            </button>
          ))}
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {total === 0 ? "No matches" : `${total} match${total === 1 ? "" : "es"}`}
      </div>

      {exact && (
        <Lobe soft tone={/completed|terminated/i.test(exact.group.recall.status) ? "sun" : "coral"} className="grid max-w-2xl gap-4 p-6">
          <div>
            <div className="display text-4xl">{exact.brand}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <HazardChip recall={exact.group.recall} />
              <span className="font-bold">{exact.group.recall.hazard}</span>
            </div>
          </div>
          {/* Outlined chips take the on-fill ink here, so they read on the fill in both themes. */}
          <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] [&_.chip--outline]:border-on-fill [&_.chip--outline]:text-on-fill">
            <dt className="font-semibold">Made by</dt>
            <dd className="font-bold">
              {exact.group.company}
              {exact.group.parent && `, ${exact.group.parent}`}
            </dd>
            {exact.group.brands.length > 1 && (
              <>
                <dt className="font-semibold">Same plant also made</dt>
                <dd className="flex flex-wrap gap-1.5">{exact.group.brands.filter((b) => b !== exact.brand).map(brandChip)}</dd>
              </>
            )}
            {exact.group.establishments.length > 0 && exact.group.plantOwner && (
              <>
                <dt className="font-semibold">{possessive(exact.group.plantOwner)} plant numbers</dt>
                <dd className="space-y-1">
                  <PlantNumbers establishments={exact.group.establishments} />
                  <p>Find one in the round USDA stamp and it came from that plant.</p>
                </dd>
              </>
            )}
            {exact.group.recall.window && (
              <>
                <dt className="font-semibold">Covered dates</dt>
                <dd className="font-bold">{exact.group.recall.window}</dd>
              </>
            )}
            <dt className="font-semibold">What to do</dt>
            <dd className="font-bold">{exact.group.recall.action}</dd>
          </dl>
        </Lobe>
      )}

      {!query.trim() ? null : total === 0 ? (
        <p className="text-sm text-ink-2">
          None of the hand-checked examples or FSIS plant numbers match “{query}”. The supplier map below shows every
          current notice that names it, and who owns the brand.
        </p>
      ) : (
        <div>
          {hits.map((g) => (
            <article key={g.recall.key} className="row-rule grid gap-x-6 gap-y-3 px-1 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="min-w-0 space-y-2">
                <h3 className="text-lg font-extrabold leading-tight">
                  {g.company}
                  {g.parent && <span className="font-semibold text-ink-2"> · {g.parent}</span>}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {g.brands.length > 0 ? g.brands.map(brandChip) : <span className="text-sm text-ink-2">Brands are on the FSIS product list</span>}
                </div>
                {g.establishments.length > 0 && g.plantOwner && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                    {possessive(g.plantOwner)} plant no., in the USDA stamp:
                    <PlantNumbers establishments={g.establishments} />
                  </div>
                )}
                <button type="button" className="link text-sm" onClick={() => onTrace(g.nodes.find((id) => NODES.find((x) => x.id === id)?.tier === 1) ?? g.nodes[0])}>
                  Show on the supplier map
                </button>
              </div>
              <RecallBrief recall={g.recall} />
            </article>
          ))}
          {plantHits.map((h) => (
            <article key={h.recall.id} className="row-rule grid gap-x-6 gap-y-3 px-1 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="min-w-0 space-y-2">
                <h3 className="text-lg font-extrabold leading-tight">{h.firm}</h3>
                <p className="text-sm">
                  <span className="chip chip--outline mr-1.5 px-1.5 py-0 font-mono text-[0.68rem]">{h.establishment}</span>
                  is the plant this notice names. A package stamped with it came from {possessive(h.firm)} plant.
                </p>
              </div>
              <div className="min-w-0 space-y-1.5 text-sm">
                <p className="font-semibold">{h.recall.reason}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip {...classificationChip(h.recall.classification)}>{h.recall.classification}</Chip>
                  <Chip {...statusChip(h.recall.status)}>{h.recall.status}</Chip>
                </div>
                <p className="line-clamp-3 text-ink-2">{h.recall.productDescription}</p>
                <RecordLine agency="USDA FSIS" reference={h.recall.recallNumber} date={formatFdaDate(h.recall.reportDate)} url={h.recall.url} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
