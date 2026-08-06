import { Card, Chip } from "@heroui/react";
import type { Recall } from "@/data/types";
import { classifyRecall } from "@/data/contaminants";
import { ContaminantBadge } from "@/components/ContaminantBadge";
import { formatFdaDate } from "@/lib/utils";

type ChipColor = "danger" | "warning" | "default" | "success" | "accent";

/** Map an FDA/FSIS classification to a chip color by severity. */
export function classificationColor(c: string): ChipColor {
  if (c === "Class I") return "danger";
  if (c === "Class III") return "default";
  if (/public health alert/i.test(c)) return "warning";
  return "warning"; // Class II
}

/** One recall record card — used by the recall feed and the outbreak detail page. */
export function RecallRow({ recall }: { recall: Recall }) {
  const date = formatFdaDate(recall.reportDate ?? recall.recallInitiationDate);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip color={classificationColor(recall.classification)} variant="soft" size="sm">
          {recall.classification}
        </Chip>
        <Chip color="default" variant="tertiary" size="sm">
          {recall.status}
        </Chip>
        <Chip color={recall.agency === "FSIS" ? "accent" : "default"} variant="soft" size="sm">
          {recall.agency === "FSIS" ? "USDA FSIS" : "FDA"}
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
      <p className="mt-2 text-sm font-medium">{recall.productDescription}</p>
      <p className="mt-1 text-sm text-muted-foreground">{recall.reason}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Recalling firm: {recall.recallingFirm} ·{" "}
        {recall.url ? (
          <a
            href={recall.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            #{recall.recallNumber}
          </a>
        ) : (
          <>#{recall.recallNumber}</>
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
