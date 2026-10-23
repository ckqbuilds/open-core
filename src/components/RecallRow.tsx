import { useState } from "react";
import { Card } from "@heroui/react";
import { Chip } from "@/components/ui/chip";
import type { Recall } from "@/data/types";
import { classifyRecall } from "@/data/contaminants";
import { ContaminantBadge } from "@/components/ContaminantBadge";
import { cleanFirmName, repairEncoding } from "@/data/avoidance";
import { classificationChip, statusChip, agencyChip, agencyLabel } from "@/lib/classification";
import { cn, formatFdaDate } from "@/lib/utils";

/** One recall record card — used by the recall feed and the outbreak detail page. */
export function RecallRow({ recall }: { recall: Recall }) {
  const [expanded, setExpanded] = useState(false);
  const description = repairEncoding(recall.productDescription);
  // Some FSIS descriptions run 90+ words of ALL CAPS; clamp to 3 lines unless short.
  const isLong = description.length > 220 || description.split(/\s+/).length > 35;
  const date = formatFdaDate(recall.reportDate ?? recall.recallInitiationDate);
  // FSIS records carry "N/A" where FDA has a recall number; don't print a non-number.
  const hasNumber = Boolean(recall.recallNumber) && !/^(n\/a|—|-|unknown)$/i.test(recall.recallNumber.trim());
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip {...classificationChip(recall.classification)} size="sm">
          {recall.classification}
        </Chip>
        <Chip {...statusChip(recall.status)} size="sm">
          {recall.status}
        </Chip>
        <Chip {...agencyChip(recall.agency)} size="sm">
          {agencyLabel(recall.agency)}
        </Chip>
        <ContaminantBadge classification={classifyRecall(recall)} />
        {recall.nationwide && (
          <Chip color="default" variant="soft" size="sm">
            Nationwide
          </Chip>
        )}
        {!recall.nationwide &&
          recall.distributionStates.slice(0, 6).map((s) => (
            <Chip key={s} color="default" variant="soft" size="sm">
              {s}
            </Chip>
          ))}
        {date && <span className="ml-auto text-xs text-muted-foreground">{date}</span>}
      </div>
      <p className={cn("mt-2 text-sm font-medium", isLong && !expanded && "line-clamp-3")}>
        {description}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 self-start rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      <p className="mt-1 text-sm text-muted-foreground">{repairEncoding(recall.reason)}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Recalling firm: {cleanFirmName(recall.recallingFirm)}
        {recall.url ? (
          <>
            {" · "}
            <a
              href={recall.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {hasNumber ? `#${recall.recallNumber}` : "Official notice"}
            </a>
          </>
        ) : (
          hasNumber && <> · #{recall.recallNumber}</>
        )}
        {recall.retailListUrl && (
          <>
            {" · "}
            <a
              href={recall.retailListUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Retail list (PDF)
            </a>
          </>
        )}
      </p>
    </Card>
  );
}
