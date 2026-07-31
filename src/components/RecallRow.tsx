import type { Recall } from "@/data/types";
import { formatFdaDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function classificationTone(c: string): "critical" | "serious" | "warning" {
  if (c === "Class I") return "critical";
  if (c === "Class III") return "warning";
  return "serious"; // Class II
}

/** One recall record card — used by the recall feed and the outbreak detail page. */
export function RecallRow({ recall }: { recall: Recall }) {
  const tone = classificationTone(recall.classification);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={tone}>{recall.classification}</Badge>
          <Badge variant="outline">{recall.status}</Badge>
          {recall.nationwide && <Badge variant="secondary">Nationwide</Badge>}
          {!recall.nationwide &&
            recall.distributionStates.slice(0, 6).map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatFdaDate(recall.reportDate ?? recall.recallInitiationDate)}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium">{recall.productDescription}</p>
        <p className="mt-1 text-sm text-muted-foreground">{recall.reason}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Recalling firm: {recall.recallingFirm} · #{recall.recallNumber}
        </p>
      </CardContent>
    </Card>
  );
}
