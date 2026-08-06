import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceLink } from "@/components/common";
import { CONTAMINANTS, type ContaminantInfo } from "@/data/contaminants";
import { cn } from "@/lib/utils";

/**
 * Teaches the four food-safety hazard types (+ the honest "other" bucket) and
 * is explicit that the per-recall badges elsewhere in the app are inferred from
 * the recall's reason text, not read from an official FDA field.
 */
export function ContaminationSection() {
  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <p className="text-sm text-muted-foreground">
          Food-safety investigators sort contamination into four hazard types —{" "}
          <span className="font-medium text-foreground">biological</span>,{" "}
          <span className="font-medium text-foreground">chemical</span>,{" "}
          <span className="font-medium text-foreground">physical</span>, and{" "}
          <span className="font-medium text-foreground">allergenic</span>. Knowing the type tells
          you what kind of hazard a recall describes at a glance — "Listeria", "elevated lead",
          "metal fragments", and "undeclared milk" are four very different problems.
        </p>
        <p className="text-sm text-muted-foreground">
          Not every recall is a contaminant, so we keep an honest fifth bucket for quality and
          labeling problems.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {CONTAMINANTS.map((c) => (
          <TypeCard key={c.id} info={c} />
        ))}
      </div>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4 text-sm text-muted-foreground">
          On the Recalls page, each recall is tagged with a hazard type{" "}
          <span className="font-medium text-foreground">
            categorized from its reason text — a guide, not an official FDA field
          </span>
          . The reason text is written for people, not machines, so the tag is a best-effort read of
          what the recall says. It never claims a product is safe.
        </CardContent>
      </Card>
    </div>
  );
}

const TONE_HEADER: Record<ContaminantInfo["tone"], string> = {
  biological: "text-red-700 dark:text-red-300",
  chemical: "text-violet-700 dark:text-violet-300",
  physical: "text-slate-700 dark:text-slate-300",
  allergenic: "text-amber-700 dark:text-amber-300",
  other: "text-muted-foreground",
};

function TypeCard({ info }: { info: ContaminantInfo }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">
            {info.emoji}
          </span>
          <CardTitle className={cn("text-base", TONE_HEADER[info.tone])}>{info.label}</CardTitle>
        </div>
        <p className="pt-2 text-sm text-muted-foreground">{info.blurb}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {info.subcategories.length > 0 && (
          <ul className="space-y-2">
            {info.subcategories.map((s) => (
              <li key={s.name} className="rounded-md bg-secondary/60 p-3">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{s.examples}</div>
              </li>
            ))}
          </ul>
        )}
        {info.source && <SourceLink source={info.source} />}
      </CardContent>
    </Card>
  );
}
