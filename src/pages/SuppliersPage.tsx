import { useMemo, useRef, useState } from "react";
import { loadFsisRecalls, type FsisFeed } from "@/data/fsis";
import {
  NODE_BY_ID,
  PLANTS,
  TIER_LABEL,
  chainOf,
  familyOf,
  ownershipNotesIn,
  recallsIn,
  resolveRecalls,
  shelfGroups,
  type Tier,
} from "@/data/supplyChain";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/PageHeader";
import { KeyButton } from "@/components/KeyButton";
import { InfoNote, SectionHeading, Sheet } from "@/components/common";
import { SupplierMap } from "@/components/SupplierMap";
import { AisleCheck } from "@/components/AisleCheck";
import { RecallRipple } from "@/components/RecallRipple";
import { SupplyHoverCard, useSupplyHover } from "@/components/SupplyHoverCard";
import { MiniStamp, PlantNumbers, RecallBrief } from "@/components/SupplyParts";
import { cn } from "@/lib/utils";

/**
 * Who's upstream of a brand: the supplier map, the in-store aisle check, and how
 * a recall ripples from one supplier to other makers and brands.
 */
export function SuppliersPage() {
  useDocumentTitle("Suppliers · OpenCORE");
  const fsis = useAsync<FsisFeed>((signal) => loadFsisRecalls(signal), []);
  const fsisRecalls = fsis.data?.recalls ?? [];
  const recalls = useMemo(() => resolveRecalls(fsisRecalls), [fsisRecalls]);
  const groups = useMemo(() => shelfGroups(recalls), [recalls]);

  const [selected, setSelected] = useState<string | null>("state-fair");
  const hover = useSupplyHover();
  const mapRef = useRef<HTMLElement>(null);

  const trace = (id: string) => {
    setSelected(id);
    hover.clear();
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title="Who makes it"
        description="Trace a brand back to the company and the plant that made it, and see which other brands came from the same place. Hover any box or brand for what was found, the dates covered and what to do."
        actions={<KeyButton />}
      />

      <section aria-labelledby="aisle-h" className="space-y-5">
        <SectionHeading as="h2">
          <span id="aisle-h">Check a brand or plant number</span>
        </SectionHeading>
        <AisleCheck
          groups={groups}
          fsis={fsisRecalls}
          onTrace={trace}
          onHover={hover.fromPointer}
          onLeave={hover.clear}
        />
      </section>

      <section ref={mapRef} aria-labelledby="map-h" className="scroll-mt-24 space-y-5">
        <div className="space-y-3">
          <SectionHeading as="h2">
            <span id="map-h">Supplier map</span>
          </SectionHeading>
          <p className="prose-measure text-ink-2">
            Read left to right, from the company down to where the product was sold. Click any box to light up its
            chain and fade everything else. Click it again, or an empty spot, to clear.
          </p>
          <Legend />
          <p className="text-sm text-ink-2 md:hidden">Swipe the map sideways to see brands and stores.</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <SupplierMap
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              hover.clear();
            }}
            onHover={hover.fromPointer}
            onFocusNode={hover.fromFocus}
            onLeave={hover.clear}
          />
          <ChainPanel selected={selected} recalls={recalls} onSelect={setSelected} />
        </div>
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

      <SupplyHoverCard target={hover.target} recalls={recalls} hint={selected ? undefined : "Click to light up its chain"} />
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
        Parent company or store brand, from public sources
      </span>
    </div>
  );
}

/** The selected box's chain, the brands that share its source, and the recalls along it. */
function ChainPanel({
  selected,
  recalls,
  onSelect,
}: {
  selected: string | null;
  recalls: ReturnType<typeof resolveRecalls>;
  onSelect: (id: string | null) => void;
}) {
  if (!selected) {
    return (
      <Sheet className="space-y-2 p-5 lg:sticky lg:top-24">
        <h3 className="display-md text-2xl">Pick a box</h3>
        <p className="text-sm text-ink-2">
          Click any company, plant, brand or store to light up its chain from the company down to the store.
        </p>
      </Sheet>
    );
  }
  const node = NODE_BY_ID[selected];
  const chain = chainOf(selected);
  const tiers = ([0, 1, 2, 3] as Tier[])
    .map((t) => [t, [...chain].map((id) => NODE_BY_ID[id]).filter((x) => x.tier === t)] as const)
    .filter(([, list]) => list.length > 0);
  const siblings = [...familyOf(selected)].map((id) => NODE_BY_ID[id]).filter((x) => x.tier === 2 && !chain.has(x.id));
  const notes = ownershipNotesIn(chain);
  const onChain = recallsIn(chain, recalls);

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
                    {PLANTS[x.id] && <PlantNumbers establishments={PLANTS[x.id].establishments} className="mt-1" />}
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
          {notes.map((t) => (
            <p key={t} className="text-sm text-ink-2">
              {t}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="text-xs font-bold text-ink-2">Recalls on this chain</div>
        {onChain.map((r) => (
          <RecallBrief key={r.key} recall={r} className="border-t border-rule pt-3" />
        ))}
      </div>
    </Sheet>
  );
}
