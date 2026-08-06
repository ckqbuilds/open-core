import { Card, Chip } from "@heroui/react";
import { ExternalLink } from "lucide-react";
import type { AvoidanceItem } from "@/data/avoidance";
import type { SourceCitation } from "@/data/types";
import { classificationColor } from "./RecallRow";
import { SourceLink } from "./common";
import { formatFdaDate } from "@/lib/utils";

/** Agency label matching the RecallRow chip wording. */
function agencyLabel(agency: AvoidanceItem["agency"]): string {
  if (agency === "FSIS") return "USDA FSIS";
  if (agency === "CDC") return "CDC";
  return "FDA";
}

/**
 * One shelf-recognition card: the brand/product, its package codes (UPCs), and
 * where the official notice says it was sold — the facts a shopper needs to
 * spot a recalled item. Mirrors the HeroUI Card/Chip layout of RecallRow.
 */
export function AvoidanceCard({ item }: { item: AvoidanceItem }) {
  const date = formatFdaDate(item.sourceDate);
  const hasClass = item.classification && item.classification !== "—";

  // Where it reaches the shelf: named retailers if the record gives them,
  // otherwise the honest distribution reach. Never phrased as a safety verdict.
  const soldAt = item.retailers.length
    ? item.retailers.join(", ")
    : item.nationwide
      ? "Distributed nationwide"
      : item.states.length
        ? `Distributed in ${item.states.slice(0, 8).join(", ")}`
        : null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {hasClass && (
          <Chip color={classificationColor(item.classification!)} variant="soft" size="sm">
            {item.classification}
          </Chip>
        )}
        <Chip color={item.agency === "FSIS" ? "accent" : "default"} variant="soft" size="sm">
          {agencyLabel(item.agency)}
        </Chip>
        {date !== "—" && <span className="ml-auto text-xs text-muted-foreground">{date}</span>}
      </div>

      <p className="mt-2 text-sm font-semibold leading-snug">{item.product}</p>

      {item.upcs.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">UPC</span>
          {item.upcs.slice(0, 8).map((u) => (
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
        </div>
      )}

      {soldAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Sold at / as:</span> {soldAt}
        </p>
      )}

      <p className="mt-1.5 text-xs text-muted-foreground">Recalling firm: {item.firm}</p>

      {item.url && (
        <div className="mt-2">
          {item.agency === "FSIS" ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              USDA FSIS notice
            </a>
          ) : (
            <SourceLink source={sourceFor(item)} />
          )}
        </div>
      )}

      {item.retailListUrl && (
        <div className="mt-1.5">
          <a
            href={item.retailListUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            See the stores that received this — official FSIS retail list (PDF) →
          </a>
        </div>
      )}
    </Card>
  );
}

/** Build the SourceCitation SourceLink renders (FDA/CDC only — FSIS handled inline). */
function sourceFor(item: AvoidanceItem): SourceCitation {
  return {
    agency: item.agency === "CDC" ? "CDC" : "FDA",
    label: item.product,
    url: item.url!,
    date: formatFdaDate(item.sourceDate),
  };
}
