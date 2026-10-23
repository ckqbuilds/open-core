import { useState } from "react";
import { Card } from "@heroui/react";
import { Chip } from "@/components/ui/chip";
import { ChevronDown, ExternalLink, MapPin, ShoppingCart } from "lucide-react";
import type { AvoidanceDigest as Digest, AvoidanceEvent, AvoidanceLine, NamedRetailerItem } from "@/data/avoidance";
import type { GeoZip } from "@/data/types";
import { classificationChip, statusChip, agencyChip, agencyLabel } from "@/lib/classification";
import { SourceLink } from "./common";
import { PATHOGENS } from "@/data/symptoms";
import { formatFdaDate, formatIso, cn } from "@/lib/utils";

const RETAIL_PREVIEW = 6;
const STATES_PREVIEW = 8;

/**
 * "What to avoid on the shelf": one card per recall event (however many
 * product lines the agency filed), retail packages first, case-pack lines for
 * restaurants folded away, lot codes on request, and the reader's own state
 * called out. Curated retailers an FDA/CDC record names follow the events.
 */
export function AvoidanceDigest({
  digest,
  geo,
  foodLabel,
}: {
  digest: Digest;
  geo: GeoZip | null;
  /** Lowercase food name for the "Other recalls naming …" sub-heading. */
  foodLabel?: string;
}) {
  if (digest.events.length === 0 && digest.retailers.length === 0) return null;
  const tied = digest.events.filter((e) => e.tiedPathogen);
  const other = digest.events.filter((e) => !e.tiedPathogen);
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingCart className="size-4 text-[color:var(--status-critical)]" />
        <h2 className="text-lg font-semibold">What to avoid on the shelf</h2>
      </div>
      <p className="max-w-prose text-sm text-muted-foreground">
        The brands, package sizes, and codes each official notice lists, grouped by recall. Being
        listed means the product is under recall, not that a store is unsafe.
      </p>
      <div className="space-y-3">
        {tied.map((ev) => (
          <EventCard key={ev.id} ev={ev} geo={geo} />
        ))}
        {tied.length > 0 && other.length > 0 && (
          <h3 className="pt-2 text-sm font-semibold text-muted-foreground">
            Other recalls naming {foodLabel ?? "this food"}
          </h3>
        )}
        {other.map((ev) => (
          <EventCard key={ev.id} ev={ev} geo={geo} />
        ))}
        {digest.retailers.map((r) => (
          <RetailerCard key={r.id} item={r} />
        ))}
      </div>
    </section>
  );
}

function EventCard({ ev, geo }: { ev: AvoidanceEvent; geo: GeoZip | null }) {
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
          <Chip {...classificationChip(ev.classification)} size="sm">
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
        {date !== "—" && <span className="ml-auto text-xs text-muted-foreground">{date}</span>}
      </div>

      <h3 className="mt-2.5 text-base font-semibold leading-snug">{ev.firm}</h3>
      {ev.tiedPathogen && (
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
          Tied to the active {PATHOGENS.find((p) => p.id === ev.tiedPathogen)?.name ?? ev.tiedPathogen}{" "}
          outbreak by pathogen, not a confirmed link
        </p>
      )}
      {ev.reasons[0] && <p className="mt-0.5 text-sm text-muted-foreground">{ev.reasons[0]}</p>}

      <Reach ev={ev} geo={geo} />

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
              className="mt-1.5 text-sm font-medium text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            className="inline-flex items-start gap-1.5 text-left text-sm font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            className="inline-flex items-start gap-1.5 text-left text-sm font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

      {ev.retailers.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="font-medium">Sold at:</span>{" "}
          <span className="text-muted-foreground">{ev.retailers.join(", ")}</span>
        </p>
      )}

      {(ev.recordCount > 1 || ev.url || ev.retailListUrl) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {ev.recordCount > 1 && <span>{ev.recordCount} agency notices merged</span>}
          {ev.url && (
            <a
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              {ev.agency === "FSIS" ? "USDA FSIS notice" : "FDA notice"}
            </a>
          )}
          {ev.retailListUrl && (
            <a
              href={ev.retailListUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              Stores that received it (FSIS PDF)
            </a>
          )}
        </p>
      )}
    </Card>
  );
}

/** Where the notice says it went, with the reader's own state answered first. */
function Reach({ ev, geo }: { ev: AvoidanceEvent; geo: GeoZip | null }) {
  const [open, setOpen] = useState(false);
  const mine = geo?.stateAbbr;
  const hasStates = ev.states.length > 0;
  if (!ev.nationwide && !hasStates) {
    return ev.distribution[0] ? (
      <p className="mt-2 text-sm text-muted-foreground">
        <MapPin className="mr-1 inline size-3.5 -translate-y-px" aria-hidden />
        {ev.distribution[0]}
      </p>
    ) : null;
  }
  const reachesMine = !!mine && (ev.nationwide || ev.states.includes(mine));
  const shown = open ? ev.states : ev.states.slice(0, STATES_PREVIEW);
  const more = ev.states.length - shown.length;

  return (
    <p className="mt-2 text-sm">
      <MapPin
        aria-hidden
        className={cn(
          "mr-1 inline size-3.5 -translate-y-px",
          reachesMine ? "text-[color:var(--status-critical)]" : "text-muted-foreground"
        )}
      />
      {mine && (
        <span className={cn("font-medium", !reachesMine && "text-muted-foreground")}>
          {reachesMine ? `Reaches ${mine}` : `${mine} not listed`}
          <span aria-hidden> · </span>
        </span>
      )}
      <span className="text-muted-foreground">
        {ev.nationwide
          ? "Distributed nationwide"
          : `Distributed in ${ev.states.length} ${ev.states.length === 1 ? "state" : "states"}: ${shown.join(", ")}`}
        {more > 0 && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="font-medium text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              +{more} more
            </button>
          </>
        )}
      </span>
    </p>
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
