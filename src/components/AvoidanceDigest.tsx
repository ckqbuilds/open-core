import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { ChevronDown } from "lucide-react";
import type { AvoidanceDigest as Digest, AvoidanceEvent, AvoidanceLine, NamedRetailerItem } from "@/data/avoidance";
import type { GeoZip } from "@/data/types";
import { Disclosure } from "@/components/Disclosure";
import { KeyButton } from "@/components/KeyButton";
import { classificationChip, classificationTitle, statusChip, agencyChip, agencyLabel } from "@/lib/classification";
import { Sheet, SourceLink } from "./common";
import { ReachLine } from "./ReachLine";
import { RecordLine, recordRule } from "./RecordLine";
import { PATHOGENS } from "@/data/symptoms";
import { formatFdaDate, formatIso, cn, isStale, staleNotice } from "@/lib/utils";

const RETAIL_PREVIEW = 6;

/**
 * "What to avoid on the shelf": one card per recall event (however many
 * product lines the agency filed), retail packages first, case-pack lines for
 * restaurants folded away, lot codes on request, and the reader's own state
 * called out. Curated retailers an FDA/CDC record names follow the events.
 */
export function AvoidanceDigest({
  digest,
  geo,
  group,
  hideRetailers = false,
  hideStale = false,
}: {
  digest: Digest;
  geo: GeoZip | null;
  /** Skip the named-seller cards when the page already lists them elsewhere. */
  hideRetailers?: boolean;
  /** Skip the per-card stale-date line when the page already shows one above. */
  hideStale?: boolean;
  /** What the non-tied events were grouped by: a food page's category or an outbreak's pathogen. */
  group?: { kind: "food" | "pathogen"; label: string };
}) {
  const retailers = hideRetailers ? [] : digest.retailers;
  if (digest.events.length === 0 && retailers.length === 0) return null;
  const isClosed = (e: AvoidanceEvent) => e.status === "Terminated" || e.status === "Completed";
  const openEvents = digest.events.filter((e) => !isClosed(e));
  const closed = digest.events.filter(isClosed);
  const tied = openEvents.filter((e) => e.tiedPathogen || e.namedInAdvisory);
  const other = openEvents.filter((e) => !e.tiedPathogen && !e.namedInAdvisory);
  const otherLabel =
    group?.kind === "pathogen"
      ? `Same pathogen, other recalls (${other.length})`
      : `Other recalls that mention a ${group?.label ?? "food"} term (${other.length})`;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="display-md text-2xl">What to avoid on the shelf</h2>
        <p className="prose-measure mt-2 text-sm text-ink-2">
        The brands, package sizes, and codes each official notice lists, grouped by recall. Being
        listed means the product is under recall, not that a store is unsafe.
        {other.length > 0 && group?.kind === "food" && " Recalls that only mention a related word are folded below."}
        {closed.length > 0 && " Closed recalls are listed separately."}
        </p>
        <div className="mt-2">
          <KeyButton variant="link" />
        </div>
      </div>
      <div className="space-y-4">
        {tied.map((ev) => (
          <EventCard key={ev.id} ev={ev} geo={geo} group={group} hideStale={hideStale} />
        ))}
        {retailers.length > 0 && (
          <>
            <h3 className="pt-2 text-base font-extrabold">Named sellers</h3>
            {retailers.map((r) => (
              <RetailerCard key={r.id} item={r} />
            ))}
          </>
        )}
        {other.length > 0 && (
          <Disclosure label={otherLabel}>
            <div className="space-y-4">
              {other.map((ev) => (
                <EventCard key={ev.id} ev={ev} geo={geo} group={group} hideStale={hideStale} />
              ))}
            </div>
          </Disclosure>
        )}
        {closed.length > 0 && (
          <Disclosure label={`Closed recalls (${closed.length})`}>
            <div className="space-y-4">
              {closed.map((ev) => (
                <EventCard key={ev.id} ev={{ ...ev, tiedPathogen: undefined }} geo={geo} group={group} hideStale={hideStale} />
              ))}
            </div>
          </Disclosure>
        )}
      </div>
    </section>
  );
}

function EventCard({
  ev,
  geo,
  group,
  hideStale = false,
}: {
  ev: AvoidanceEvent;
  geo: GeoZip | null;
  group?: { kind: "food" | "pathogen"; label: string };
  hideStale?: boolean;
}) {
  const [allRetail, setAllRetail] = useState(false);
  const [wholesaleOpen, setWholesaleOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const date = formatFdaDate(ev.sourceDate);
  const retail = allRetail ? ev.retail : ev.retail.slice(0, RETAIL_PREVIEW);
  const hiddenRetail = ev.retail.length - retail.length;
  const wholesaleOnly = ev.retail.length === 0 && ev.wholesale.length > 0;

  return (
    <Sheet className="p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {ev.classification && (
          <Chip {...classificationChip(ev.classification)} title={classificationTitle(ev.classification)}>
            {ev.classification}
          </Chip>
        )}
        <Chip {...agencyChip(ev.agency)}>{agencyLabel(ev.agency)}</Chip>
        {ev.status && <Chip {...statusChip(ev.status)}>{ev.status}</Chip>}
      </div>

      <h3 className="display-md mt-3 text-2xl">{ev.firm}</h3>
      {ev.namedInAdvisory ? (
        <p className="mt-2 text-xs font-semibold text-ink-2">
          Named in {ev.namedInAdvisory.agency}&rsquo;s advisory:{" "}
          <a
            href={ev.namedInAdvisory.url}
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            {ev.namedInAdvisory.label}
          </a>
        </p>
      ) : (
        ev.tiedPathogen && (
          <p className="mt-2 text-xs font-semibold text-ink-2">
            Tied to the active {PATHOGENS.find((p) => p.id === ev.tiedPathogen)?.name ?? ev.tiedPathogen}{" "}
            outbreak by pathogen, not a confirmed link
          </p>
        )
      )}
      {ev.reasons[0] && <p className="mt-1 text-base font-semibold leading-snug">{ev.reasons[0]}</p>}
      {!ev.tiedPathogen && group?.kind === "food" && ev.matchedTerm && (
        <p className="mt-1 text-xs text-ink-2">
          Grouped here because the record mentions &ldquo;{ev.matchedTerm}&rdquo;
        </p>
      )}
      {!ev.tiedPathogen && group?.kind === "pathogen" && (
        <p className="mt-1 text-xs text-ink-2">
          Grouped here because the record names {group.label}
        </p>
      )}

      <ReachLine className="mt-3" ev={ev} geo={geo} />

      {ev.retail.length > 0 && (
        <div className="mt-3">
          {ev.wholesale.length > 0 && (
            <p className="mb-1 text-xs font-bold text-ink-2">Retail packages</p>
          )}
          <LineList lines={retail} />
          {hiddenRetail > 0 && (
            <button
              type="button"
              onClick={() => setAllRetail(true)}
              aria-label={`Show all ${ev.retail.length} products: ${ev.firm}`}
              className="link mt-1 inline-flex min-h-9 items-center text-sm"
            >
              Show all {ev.retail.length} products
            </button>
          )}
        </div>
      )}

      {ev.wholesale.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setWholesaleOpen((v) => !v)}
            aria-expanded={wholesaleOpen}
            aria-label={`${ev.wholesale.length} case-pack ${ev.wholesale.length === 1 ? "product" : "products"} for restaurants and food service: ${ev.firm}`}
            className="inline-flex min-h-9 items-center gap-1.5 text-left text-sm font-bold hover:underline"
          >
            <ChevronDown
              aria-hidden
              className={cn("size-4 shrink-0 transition-transform ease-over", wholesaleOpen && "rotate-180")}
            />
            {ev.wholesale.length} case-pack {ev.wholesale.length === 1 ? "product" : "products"} for
            restaurants and food service
          </button>
          {wholesaleOnly && !wholesaleOpen && (
            <p className="mt-1 text-xs text-ink-2">
              Case-pack sizes such as “4/5#” are the packaging sold to kitchens, not the bags on a
              store shelf.
            </p>
          )}
          {wholesaleOpen && (
            <div className="mt-2">
              <LineList lines={ev.wholesale} columns={ev.wholesale.length > 6} />
              {ev.contents.length > 0 && (
                <p className="mt-2 text-xs text-ink-2">
                  Contents as stated: {ev.contents.join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {ev.codes.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setCodesOpen((v) => !v)}
            aria-expanded={codesOpen}
            aria-label={`Lot codes and dates as stated: ${ev.firm}`}
            className="inline-flex min-h-9 items-center gap-1.5 text-left text-sm font-bold hover:underline"
          >
            <ChevronDown
              aria-hidden
              className={cn("size-4 shrink-0 transition-transform ease-over", codesOpen && "rotate-180")}
            />
            Lot codes and dates as stated
          </button>
          {codesOpen && (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-rule bg-ground p-3 font-mono text-xs leading-relaxed">
              {ev.codes.join("\n\n")}
            </pre>
          )}
        </div>
      )}

      {!hideStale && isStale(ev.sourceDate) && (
        <p className="mt-3 text-xs text-ink-2">{staleNotice(ev.sourceDate)}</p>
      )}

      {ev.status !== "Terminated" && ev.status !== "Completed" && (
        <p className="mt-3 text-sm">
          Have it? Compare its codes with the notice before eating it, and follow the notice for return or disposal.
        </p>
      )}

      {ev.retailers.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="font-bold">Sold at:</span>{" "}
          <span className="text-ink-2">{ev.retailers.join(", ")}</span>
        </p>
      )}

      <RecordLine
        className={cn("mt-3 pt-3", recordRule)}
        agency={agencyLabel(ev.agency)}
        date={date !== "—" ? date : undefined}
        url={ev.url || undefined}
        extras={[
          ...(ev.recordCount > 1 ? [{ label: `${ev.recordCount} notices merged` }] : []),
          ...(ev.retailListUrl ? [{ label: "Stores that received it (FSIS PDF)", url: ev.retailListUrl }] : []),
        ]}
      />
    </Sheet>
  );
}

function LineList({ lines, columns = false }: { lines: AvoidanceLine[]; columns?: boolean }) {
  return (
    <ul className={cn("space-y-1.5", columns && "sm:columns-2 sm:gap-x-6 sm:space-y-0 sm:[&>li]:mb-1.5 sm:[&>li]:break-inside-avoid")}>
      {lines.map((l) => (
        <li key={l.text} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-snug">
          <span>{l.text}</span>
          {l.upcs.map((u) => (
            <Chip key={u} color="quiet" className="tnum font-mono font-medium tracking-tight">
              {u}
            </Chip>
          ))}
        </li>
      ))}
    </ul>
  );
}

function RetailerCard({ item }: { item: NamedRetailerItem }) {
  const agency = item.source.agency;
  return (
    <Sheet className="p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip color="land">{agency}</Chip>
        <span className="ml-auto text-xs text-ink-2">{formatIso(item.source.date)}</span>
      </div>
      <h3 className="display-md mt-3 text-2xl">{item.name}</h3>
      <p className="mt-2 text-sm text-ink-2">
        {item.role === "retailer"
          ? `Named by ${agency} as a seller of a recalled product`
          : `Named by ${agency} as the recalling firm`}
      </p>
      {item.product && <p className="mt-3 text-sm font-bold">{item.product}</p>}
      <p className="mt-1 text-sm text-ink-2">{item.note}</p>
      <div className="mt-3">
        <SourceLink source={item.source} />
      </div>
    </Sheet>
  );
}
