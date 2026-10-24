import type { ContaminantClassification } from "@/data/contaminants";
import { cn } from "@/lib/utils";
import { HAZARD_ICONS } from "@/lib/icons";

/**
 * A small chip for a recall's heuristically derived hazard type. The drawn icon
 * tells the types apart; colour stays reserved for severity, so a biological
 * hazard on a Class I record takes coral and every other type is lilac.
 * "Other" (shown as "Unclassified") is quiet on purpose: the reason text named
 * no hazard.
 */
export function ContaminantBadge({
  classification,
  critical,
  className,
}: {
  classification: ContaminantClassification;
  /** True for a Class I record: biological then takes the critical tone. */
  critical?: boolean;
  className?: string;
}) {
  const Icon = HAZARD_ICONS[classification.type];
  const quiet = classification.type === "other";
  const tone = quiet ? "chip--quiet" : critical && classification.type === "biological" ? "chip--coral" : "chip--lilac";
  return (
    <span
      className={cn("chip", tone, className)}
      title="Hazard type, categorized from the recall's reason text, not an official FDA field"
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span>
        {classification.label}
        {!quiet && <span className="font-medium opacity-80"> · inferred</span>}
      </span>
    </span>
  );
}
