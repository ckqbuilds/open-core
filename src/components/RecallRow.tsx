import { useState } from "react";
import { Card } from "@heroui/react";
import { Chip } from "@/components/ui/chip";
import type { Recall } from "@/data/types";
import { classifyRecall } from "@/data/contaminants";
import { ContaminantBadge } from "@/components/ContaminantBadge";
import { cleanFirmName, repairEncoding } from "@/data/avoidance";
import { classificationChip, classificationTitle, statusChip, agencyChip, agencyLabel } from "@/lib/classification";
import { RecordLine, recordRule } from "@/components/RecordLine";
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
  const firm = cleanFirmName(recall.recallingFirm);
  const classDefinition =
    recall.classification === "Class I" || recall.classification === "Not Yet Classified"
      ? classificationTitle(recall.classification)
      : undefined;
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">{firm}</h3>
      <p className="mt-0.5 text-sm font-medium">{repairEncoding(recall.reason)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Chip {...classificationChip(recall.classification)} title={classificationTitle(recall.classification)} size="sm">
          {recall.classification}
        </Chip>
        <Chip {...statusChip(recall.status)} size="sm">
          {recall.status}
        </Chip>
        <Chip {...agencyChip(recall.agency)} size="sm">
          {agencyLabel(recall.agency)}
        </Chip>
        <ContaminantBadge classification={classifyRecall(recall)} critical={/^class i$/i.test(recall.classification.trim())} />
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
      </div>
      {classDefinition && <p className="mt-1.5 text-xs text-muted-foreground">{classDefinition}</p>}
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Product record</p>
      <p className={cn("mt-0.5 text-sm text-muted-foreground", isLong && !expanded && "line-clamp-3")}>
        {description}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Show less" : "Show more"}: ${firm}`}
          className="-my-2 inline-flex min-h-10 items-center self-start rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      {recall.status === "Ongoing" && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Have it? Compare its codes with the notice before eating it, and follow the notice for return or disposal.
        </p>
      )}
      <RecordLine
        className={cn("mt-3 pt-3", recordRule)}
        agency={hasNumber || !recall.url ? agencyLabel(recall.agency) : "Official notice"}
        reference={hasNumber ? `#${recall.recallNumber}` : undefined}
        date={date || undefined}
        url={recall.url || undefined}
        extras={recall.retailListUrl ? [{ label: "Retail list (PDF)", url: recall.retailListUrl }] : undefined}
      />
    </Card>
  );
}
