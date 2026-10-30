import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loadFsisRecalls, type FsisFeed } from "@/data/fsis";
import { fetchRecallsByTerm } from "@/data/openfda";
import {
  TIER_LABEL,
  curatedGraph,
  groupMatches,
  indexGraph,
  resolveRecalls,
  shelfGroups,
  type GraphIndex,
  type SupplyGraph,
  type Tier,
} from "@/data/supplyChain";
import { brandPattern, buildBrandGraph, fetchBrandOwners, recallsNaming } from "@/data/brandGraph";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/PageHeader";
import { KeyButton } from "@/components/KeyButton";
import { EmptyState, InfoNote, Loading, OutLink, SectionHeading, Sheet } from "@/components/common";
import { SupplierMap } from "@/components/SupplierMap";
import { AisleCheck } from "@/components/AisleCheck";
import { RecallRipple } from "@/components/RecallRipple";
import { MiniStamp, PlantNumbers, RecallBrief } from "@/components/SupplyParts";
import { cn } from "@/lib/utils";

/** openFDA YYYYMMDD three years back: older FDA notices rarely matter on a shelf today. */
function fdaSince(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Who's upstream of a brand: the in-store aisle check, the supplier map for
 * whatever brand is searched there, and how a recall ripples from one supplier
 * to other makers and brands.
 */
export function SuppliersPage() {
  useDocumentTitle("Suppliers · OpenCORE");
  const fsis = useAsync<FsisFeed>((signal) => loadFsisRecalls(signal), []);
  const fsisRecalls = fsis.data?.recalls ?? [];
  const recalls = useMemo(() => resolveRecalls(fsisRecalls), [fsisRecalls]);
  const groups = useMemo(() => shelfGroups(recalls), [recalls]);

  // The search lives in ?brand= so a map can be bookmarked or shared.
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => params.get("brand") ?? "");
  const brand = useDebounced(query.trim(), 350);
  useEffect(() => {
    if ((params.get("brand") ?? "") === brand) return;
    setParams(brand ? { brand } : {}, { replace: true });
  }, [brand, params, setParams]);
  // A plant number goes to the aisle check; the map draws brands and companies.
  const mappable = !!brandPattern(brand) && !/^\s*(est\.?\s*)?[a-z/]{0,3}[\s-]?\d+[a-z]?\s*$/i.test(brand);

  const fda = useAsync<Recall[]>((signal) => fetchRecallsByTerm(brand, 50, signal, fdaSince()), [brand], mappable);
  const owners = useAsync((signal) => fetchBrandOwners(brand, signal), [brand], mappable);

  const graph = useMemo<SupplyGraph | null>(() => {
    if (!mappable) return null;
    const named = [...recallsNaming(brand, fsisRecalls), ...recallsNaming(brand, fda.data ?? [])];
    const matching = groups.filter((g) => groupMatches(g, brand));
    return buildBrandGraph({
      brand,
      named,
      fsis: fsisRecalls,
      owners: owners.data?.owners ?? [],
      curated: matching.length ? curatedGraph(matching, recalls) : undefined,
    });
  }, [mappable, brand, fsisRecalls, fda.data, owners.data, groups, recalls]);
  const index = useMemo(() => (graph ? indexGraph(graph) : null), [graph]);
  const loading = mappable && (fsis.loading || fda.loading || owners.loading);

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [graph]);
  const mapRef = useRef<HTMLElement>(null);

  const trace = (id: string) => {
    setSelected(id);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title="Who makes it"
        description="Search a brand to trace it back to the company and the plant that made it, the parent company or store behind the label, and which other products came from the same place."
        actions={<KeyButton />}
      />

      <section aria-labelledby="aisle-h" className="space-y-5">
        <SectionHeading as="h2">
          <span id="aisle-h">Check a brand or plant number</span>
        </SectionHeading>
        <AisleCheck query={query} onQuery={setQuery} groups={groups} fsis={fsisRecalls} onTrace={trace} />
      </section>

      <section ref={mapRef} aria-labelledby="map-h" className="scroll-mt-24 space-y-5">
        <div className="space-y-3">
          <SectionHeading as="h2">
            <span id="map-h">{graph && graph.nodes.length > 0 ? `Supplier map for ${brand}` : "Supplier map"}</span>
          </SectionHeading>
          <p className="prose-measure text-ink-2">
            Read left to right, from the company down to where the product was sold. Click any box to light up its
            chain and fade everything else. Click it again, or an empty spot, to clear.
          </p>
          <Legend />
          <p className="text-sm text-ink-2 md:hidden">Swipe the map sideways to see brands and stores.</p>
        </div>
        <BrandMap
          brand={brand}
          mappable={mappable}
          loading={loading}
          ownersFailed={!!owners.error}
          graph={graph}
          index={index}
          selected={selected}
          onSelect={setSelected}
        />
      </section>

      <section aria-labelledby="ripple-h" className="space-y-5">
        <div className="space-y-3">
          <SectionHeading as="h2">
            <span id="ripple-h">How a recall spreads</span>
          </SectionHeading>
          <p className="prose-measure text-ink-2">
            A contaminated ingredient reaches other makers over days or weeks. Each line starts at the upstream
            recall and adds downstream products as the agencies named them.
          </p>
        </div>
        <RecallRipple />
      </section>

      <InfoNote className="flex items-center gap-4">
        <MiniStamp establishment="EST. 47991" />
        <p className="prose-measure">
          <strong className="text-ink">Reading a plant number.</strong> Every meat and poultry plant has its own USDA
          number, printed inside the round inspection stamp on each package it makes. The number belongs to the
          supplier that runs the plant, not the brand on the front, so it tells you who really made the food. Match
          the number and the covered dates against the recall.
        </p>
      </InfoNote>
    </div>
  );
}

/** The map, or what stands in for it before a search, while loading, or when nothing names the brand. */
function BrandMap({
  brand,
  mappable,
  loading,
  ownersFailed,
  graph,
  index,
  selected,
  onSelect,
}: {
  brand: string;
  mappable: boolean;
  loading: boolean;
  ownersFailed: boolean;
  graph: SupplyGraph | null;
  index: GraphIndex | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (!mappable) {
    return <EmptyState>Search a brand or company above and its map draws here.</EmptyState>;
  }
  if (!graph || !index || graph.nodes.length === 0) {
    if (loading) return <Loading>Looking up {brand}…</Loading>;
    return (
      <EmptyState>
        No recall notice or USDA brand record names “{brand}”. That isn't a safety verdict: it means it isn't named in
        a current recall.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-3">
      {(loading || ownersFailed) && (
        <p role="status" className="text-sm text-ink-2">
          {loading ? "Still loading some sources…" : "The brand owner lookup is unavailable right now, so parent and store links may be missing."}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <SupplierMap graph={graph} index={index} selected={selected} onSelect={onSelect} />
        <ChainPanel graph={graph} index={index} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
      <span className="inline-flex items-center gap-2">
        <svg aria-hidden width="32" height="8">
          <line x1="0" y1="4" x2="32" y2="4" stroke="currentColor" strokeWidth="2" />
        </svg>
        Named in the recall notice
      </span>
      <span className="inline-flex items-center gap-2">
        <svg aria-hidden width="32" height="8">
          <line x1="0" y1="4" x2="32" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" />
        </svg>
        Parent company or store brand, from USDA brand records or public sources
      </span>
    </div>
  );
}

/** The selected box's chain, the brands that share its source, and the recalls along it. */
function ChainPanel({
  graph,
  index,
  selected,
  onSelect,
}: {
  graph: SupplyGraph;
  index: GraphIndex;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (!selected || !index.byId[selected]) {
    return (
      <Sheet className="space-y-2 p-5 lg:sticky lg:top-24">
        <h3 className="display-md text-2xl">Pick a box</h3>
        <p className="text-sm text-ink-2">
          Click any company, plant, brand or store to light up its chain from the company down to the store.
        </p>
      </Sheet>
    );
  }
  const { byId } = index;
  const node = byId[selected];
  const chain = index.chainOf(selected);
  const tiers = ([0, 1, 2, 3] as Tier[])
    .map((t) => [t, [...chain].map((id) => byId[id]).filter((x) => x.tier === t)] as const)
    .filter(([, list]) => list.length > 0);
  const siblings = [...index.familyOf(selected)].map((id) => byId[id]).filter((x) => x.tier === 2 && !chain.has(x.id));
  const notes = index.ownershipNotesIn(chain);
  const onChain = index.recallsIn(chain);

  return (
    <Sheet className="space-y-5 p-5 lg:sticky lg:top-24" aria-live="polite">
      <div>
        <div className="text-xs font-bold text-ink-2">{TIER_LABEL[node.tier]} · click again to clear</div>
        <h3 className="display-md text-2xl">{node.name}</h3>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-bold text-ink-2">Chain</div>
        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          {tiers.map(([t, list]) => (
            <div key={t} className="contents">
              <dt className="text-ink-2">{TIER_LABEL[t]}</dt>
              <dd className="space-y-1">
                {list.map((x) => (
                  <div key={x.id}>
                    <span className={cn("font-bold", x.id === selected && "underline decoration-2 underline-offset-4")}>{x.name}</span>
                    {graph.plants[x.id] && <PlantNumbers establishments={graph.plants[x.id].establishments} className="mt-1" />}
                  </div>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {siblings.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-ink-2">Same source, outside this chain</div>
          <div className="flex flex-wrap gap-1.5">
            {siblings.map((b) => (
              <button key={b.id} type="button" className="capsule capsule--sm" onClick={() => onSelect(b.id)}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-bold text-ink-2">Dashed links</div>
          {notes.map(({ note, source }) => (
            <p key={note} className="text-sm text-ink-2">
              {note} {source && <OutLink href={source.url}>{source.label}</OutLink>}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="text-xs font-bold text-ink-2">Recalls on this chain</div>
        {onChain.length === 0 && <p className="text-sm text-ink-2">Not named in a current recall.</p>}
        {onChain.map((r) => (
          <RecallBrief key={r.key} recall={r} className="border-t border-rule pt-3" />
        ))}
      </div>
    </Sheet>
  );
}
