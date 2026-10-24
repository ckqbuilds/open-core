import { useState, type ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import type { Recall } from "@/data/types";
import { classifyRecall } from "@/data/contaminants";
import { ContaminantBadge } from "@/components/ContaminantBadge";
import { cleanFirmName, repairEncoding } from "@/data/avoidance";
import { classificationChip, classificationTitle, statusChip, agencyChip, agencyLabel } from "@/lib/classification";
import { Digits, RecordLine, recordRule } from "@/components/RecordLine";
import { ReachLine } from "@/components/ReachLine";
import { useZipContext } from "@/hooks/ZipContext";
import { cn, formatFdaDate } from "@/lib/utils";

/**
 * One recall record as a ruled row: reported date in the margin, the record in
 * the body. Used by the recall feed and the detail pages; every row keeps the
 * same column grid in every state.
 */
export function RecallRow({
  recall,
  showHaveIt = true,
  children,
}: {
  recall: Recall;
  /** "expanded": show the "Have it?" line only once the row is expanded (short rows have nothing to expand, so they show it). */
  showHaveIt?: boolean | "expanded";
  /** Extra content inside the row, below the record line (e.g. folded sibling notices). */
  children?: ReactNode;
}) {
  const { geo } = useZipContext();
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
    <article className="row-rule grid gap-x-6 gap-y-2 px-1 py-5 md:grid-cols-[6.5rem_minmax(0,1fr)]">
      <div className="text-sm text-ink-2 md:pt-1">
        <Digits>{date}</Digits>
      </div>

      <div className="min-w-0">
        <h3 className="text-lg font-extrabold leading-tight">{firm}</h3>
        <p className="mt-1 text-base font-semibold leading-snug">{repairEncoding(recall.reason)}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Chip {...classificationChip(recall.classification)} title={classificationTitle(recall.classification)}>
            {recall.classification}
          </Chip>
          <Chip {...statusChip(recall.status)}>{recall.status}</Chip>
          <Chip {...agencyChip(recall.agency)}>{agencyLabel(recall.agency)}</Chip>
          <ContaminantBadge classification={classifyRecall(recall)} critical={/^class i$/i.test(recall.classification.trim())} />
        </div>
        <ReachLine
          className="mt-2.5"
          ev={{
            states: recall.distributionStates,
            nationwide: recall.nationwide,
            distribution: recall.distributionPattern ? [repairEncoding(recall.distributionPattern)] : [],
          }}
          geo={geo}
        />
        {classDefinition && <p className="mt-1.5 text-xs text-ink-2">{classDefinition}</p>}

        <p className="mt-3 text-xs font-bold text-ink-2">Product record</p>
        <p className={cn("mt-0.5 text-sm text-ink-2", isLong && !expanded && "line-clamp-3")}>{description}</p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Show less" : "Show more"}: ${firm}`}
            className="link mt-1 inline-flex min-h-9 items-center text-sm"
          >
            {expanded ? "Show less" : "Show the whole record"}
          </button>
        )}
        {showHaveIt && (showHaveIt === true || expanded || !isLong) && recall.status === "Ongoing" && (
          <p className="mt-2 text-sm">
            Have it? Compare its codes with the notice before eating it, and follow the notice for return or disposal.
          </p>
        )}
        <RecordLine
          className={cn("mt-3 pt-3", recordRule)}
          agency={hasNumber || !recall.url ? agencyLabel(recall.agency) : recall.agency === "FSIS" ? "Official notice" : "FDA notice"}
          reference={hasNumber ? `#${recall.recallNumber}` : undefined}
          date={date || undefined}
          url={recall.url || undefined}
          extras={recall.retailListUrl ? [{ label: "Retail list (PDF)", url: recall.retailListUrl }] : undefined}
        />
        {children}
      </div>
    </article>
  );
}
