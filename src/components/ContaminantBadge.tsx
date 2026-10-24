import {
  type ContaminantClassification,
  type ContaminantType,
} from "@/data/contaminants";
import { cn } from "@/lib/utils";
import { HAZARD_ICONS } from "@/lib/icons";

/** Tone-per-type styling — five visually distinct hues, theme-aware. */
const TONE_CLASSES: Record<ContaminantType, string> = {
  biological: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  chemical: "border-violet-500/30 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  physical: "border-slate-400/40 bg-slate-400/15 text-slate-700 dark:text-slate-300",
  allergenic: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  // "other" stays quiet — it is not a hazard.
  other: "border-transparent bg-secondary text-muted-foreground",
};

/**
 * A small badge for a recall's heuristically-derived hazard type. It shows the
 * type icon + label (e.g. "Biological · bacteria"). "Other" (shown as
 * "Unclassified") is styled quiet on purpose: the reason text named no hazard.
 */
export function ContaminantBadge({
  classification,
  critical,
  className,
}: {
  classification: ContaminantClassification;
  /** True for a Class I record: biological then takes the critical (red) tone. */
  critical?: boolean;
  className?: string;
}) {
  const Icon = HAZARD_ICONS[classification.type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        critical && classification.type === "biological"
          ? "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-300"
          : TONE_CLASSES[classification.type],
        className
      )}
      title="Hazard type — categorized from the recall's reason text, not an official FDA field"
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span>
        {classification.label}
        {classification.type !== "other" && <span className="font-normal"> · inferred</span>}
      </span>
    </span>
  );
}
