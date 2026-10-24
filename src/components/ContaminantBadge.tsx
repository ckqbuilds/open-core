import type { ContaminantClassification } from "@/data/contaminants";
import { cn } from "@/lib/utils";
import { HAZARD_ICONS } from "@/lib/icons";

/**
 * A small chip for a recall's heuristically derived hazard type. The drawn icon
 * tells the types apart; colour stays reserved for severity, so every hazard
 * type is lilac.
 * "Other" (shown as "Unclassified") is quiet on purpose: the reason text named
 * no hazard.
 */
export function ContaminantBadge({
  classification,
  className,
}: {
  classification: ContaminantClassification;
  /** Ignored: hazard type is never coral, only severity is. Kept so call sites compile. */
  critical?: boolean;
  className?: string;
}) {
  const Icon = HAZARD_ICONS[classification.type];
  const quiet = classification.type === "other";
  const tone = quiet ? "chip--quiet" : "chip--lilac";
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
