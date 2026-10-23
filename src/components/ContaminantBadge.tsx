import {
  contaminantById,
  type ContaminantClassification,
  type ContaminantType,
} from "@/data/contaminants";
import { cn } from "@/lib/utils";

/** Tone-per-type styling — five visually distinct hues, theme-aware. */
const TONE_CLASSES: Record<ContaminantType, string> = {
  biological: "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-300",
  chemical: "border-violet-500/30 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  physical: "border-slate-400/40 bg-slate-400/15 text-slate-700 dark:text-slate-300",
  allergenic: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  // "other" stays quiet — it is not a hazard.
  other: "border-transparent bg-secondary text-muted-foreground",
};

/**
 * A small badge for a recall's heuristically-derived hazard type. It shows the
 * type emoji + label (e.g. "🦠 Biological · bacteria"). "Other" (shown as
 * "Unclassified") is styled quiet on purpose: the reason text named no hazard.
 */
export function ContaminantBadge({
  classification,
  className,
}: {
  classification: ContaminantClassification;
  className?: string;
}) {
  const info = contaminantById(classification.type);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[classification.type],
        className
      )}
      title="Hazard type — categorized from the recall's reason text, not an official FDA field"
    >
      {info.emoji && <span aria-hidden>{info.emoji}</span>}
      <span aria-hidden>{classification.label}</span>
      <span className="sr-only">
        {classification.label} (from reason text, not an official field)
      </span>
    </span>
  );
}
