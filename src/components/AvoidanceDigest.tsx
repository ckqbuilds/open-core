import { useState } from "react";
import { Card } from "@heroui/react";
import { Chip } from "@/components/ui/chip";
import { ChevronDown, ShoppingCart } from "lucide-react";
import type { AvoidanceDigest as Digest, AvoidanceEvent, AvoidanceLine, NamedRetailerItem } from "@/data/avoidance";
import type { GeoZip } from "@/data/types";
import { Disclosure } from "@/components/Disclosure";
import { KeyButton } from "@/components/KeyButton";
import { classificationChip, classificationTitle, statusChip, agencyChip, agencyLabel } from "@/lib/classification";
import { SourceLink } from "./common";
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
}: {
  digest: Digest;
  geo: GeoZip | null;
  /** Skip the named-seller cards when the page already lists them elsewhere. */
  hideRetailers?: boolean;
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
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingCart className="size-4 text-[color:var(--status-critical)]" />
        <h2 className="text-lg font-semibold">What to avoid on the shelf</h2>
      </div>
      <p className="max-w-prose text-sm text-muted-foreground">
        The brands, package sizes, and codes each official notice lists, grouped by recall. Being
        listed means the product is under recall, not that a store is unsafe.
        {other.length > 0 && group?.kind === "food" && " Recalls that only mention a related word are folded below."}
        {closed.length > 0 && " Closed recalls are listed separately."}
      </p>
      <KeyButton variant="link" />
      <div className="space-y-3">
        {tied.map((ev) => (
          <EventCard key={ev.id} ev={ev} geo={geo} group={group} />
        ))}
        {retailers.length > 0 && (
          <>
            <h3 className="pt-2 text-sm font-semibold text-muted-foreground">Named sellers</h3>
            {retailers.map((r) => (
              <RetailerCard key={r.id} item={r} />
            ))}
          </>
        )}
        {other.length > 0 && (
          <Disclosure label={otherLabel}>
            <div className="space-y-3 pt-2">
              {other.map((ev) => (
                <EventCard key={ev.id} ev={ev} geo={geo} group={group} />
              ))}
            </div>
          </Disclosure>
        )}
        {closed.length > 0 && (
          <Disclosure label={`Closed recalls (${closed.length})`}>
            <div className="space-y-3 pt-2">
              {closed.map((ev) => (
                <EventCard key={ev.id} ev={{ ...ev, tiedPathogen: undefined }} geo={geo} group={group} />
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
}: {
  ev: AvoidanceEvent;
  geo: GeoZip | null;
  group?: { kind: "food" | "pathogen"; label: string };
}) {
  const [allRetail, setAllRetail] = useState(false);
  const [wholesaleOpen, setWholesaleOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const date = formatFdaDate(ev.sourceDate);
  const retail = allRetail ? ev.retail : ev.retail.slice(0, RETAIL_PREVIEW);
  const hiddenRetail = ev.retail.length - retail.length;
  const wholesaleOnly = ev.retail.length === 0 && ev.wholesale.length > 0;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {ev.classification && (
          <Chip {...classificationChip(ev.classification)} title={classificationTitle(ev.classification)} size="sm">
            {ev.classification}
          </Chip>
        )}
        <Chip {...agencyChip(ev.agency)} size="sm">
          {agencyLabel(ev.agency)}
        </Chip>
        {ev.status && (
          <Chip {...statusChip(ev.status)} size="sm">
            {ev.status}
          </Chip>
        )}
      </div>

      <h3 className="mt-2.5 text-base font-semibold leading-snug">{ev.firm}</h3>
      {ev.namedInAdvisory ? (
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
          Named in {ev.namedInAdvisory.agency}&rsquo;s advisory:{" "}
          <a
            href={ev.namedInAdvisory.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ev.namedInAdvisory.label}
          </a>
        </p>
      ) : (
        ev.tiedPathogen && (
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            Tied to the active {PATHOGENS.find((p) => p.id === ev.tiedPathogen)?.name ?? ev.tiedPathogen}{" "}
            outbreak by pathogen, not a confirmed link
          </p>
        )
      )}
      {ev.reasons[0] && <p className="mt-0.5 text-sm text-muted-foreground">{ev.reasons[0]}</p>}
      {!ev.tiedPathogen && group?.kind === "food" && ev.matchedTerm && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          Grouped here because the record mentions &ldquo;{ev.matchedTerm}&rdquo;
        </p>
      )}
      {!ev.tiedPathogen && group?.kind === "pathogen" && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          Grouped here because the record names {group.label}
        </p>
      )}

      <ReachLine ev={ev} geo={geo} />

      {ev.retail.length > 0 && (
        <div className="mt-3">
          {ev.wholesale.length > 0 && (
            <p className="mb-1 text-xs font-medium text-muted-foreground">Retail packages</p>
          )}
          <LineList lines={retail} />
          {hiddenRetail > 0 && (
            <button
              type="button"
              onClick={() => setAllRetail(true)}
              aria-label={`Show all ${ev.retail.length} products: ${ev.firm}`}
              className="mt-1 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            className="inline-flex min-h-10 items-center gap-1.5 text-left text-sm font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronDown
              className={cn("mt-0.5 size-4 shrink-0 transition-transform", wholesaleOpen && "rotate-180")}
            />
            {ev.wholesale.length} case-pack {ev.wholesale.length === 1 ? "product" : "products"} for
            restaurants and food service
          </button>
          {wholesaleOnly && !wholesaleOpen && (
            <p className="mt-1 text-xs text-muted-foreground">
              Case-pack sizes such as “4/5#” are the packaging sold to kitchens, not the bags on a
              store shelf.
            </p>
          )}
          {wholesaleOpen && (
            <div className="mt-2">
              <LineList lines={ev.wholesale} columns={ev.wholesale.length > 6} />
              {ev.contents.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
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
            className="inline-flex min-h-10 items-center gap-1.5 text-left text-sm font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronDown
              className={cn("mt-0.5 size-4 shrink-0 transition-transform", codesOpen && "rotate-180")}
            />
            Lot codes and dates as stated
          </button>
          {codesOpen && (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-secondary/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
              {ev.codes.join("\n\n")}
            </pre>
          )}
        </div>
      )}

      {isStale(ev.sourceDate) && (
        <p className="mt-3 text-xs text-muted-foreground">{staleNotice(ev.sourceDate)}</p>
      )}

      {ev.status !== "Terminated" && ev.status !== "Completed" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Have it? Compare its codes with the notice before eating it, and follow the notice for return or disposal.
        </p>
      )}

      {ev.retailers.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="font-medium">Sold at:</span>{" "}
          <span className="text-muted-foreground">{ev.retailers.join(", ")}</span>
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
    </Card>
  );
}

function LineList({ lines, columns = false }: { lines: AvoidanceLine[]; columns?: boolean }) {
  return (
    <ul className={cn("space-y-1.5", columns && "sm:columns-2 sm:gap-x-6 sm:space-y-0 sm:[&>li]:mb-1.5 sm:[&>li]:break-inside-avoid")}>
      {lines.map((l) => (
        <li key={l.text} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-snug">
          <span>{l.text}</span>
          {l.upcs.map((u) => (
            <Chip
              key={u}
              color="default"
              variant="tertiary"
              size="sm"
              className="font-mono tabular-nums tracking-tight"
            >
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
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip color="default" variant="soft" size="sm">
          {agency}
        </Chip>
        <span className="ml-auto text-xs text-muted-foreground">{formatIso(item.source.date)}</span>
      </div>
      <h3 className="mt-2.5 text-base font-semibold leading-snug">{item.name}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {item.role === "retailer"
          ? `Named by ${agency} as a seller of a recalled product`
          : `Named by ${agency} as the recalling firm`}
      </p>
      {item.product && <p className="mt-3 text-sm font-medium">{item.product}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
      <div className="mt-3">
        <SourceLink source={item.source} />
      </div>
    </Card>
  );
}
