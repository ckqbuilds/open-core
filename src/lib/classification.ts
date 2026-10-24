/**
 * Single source of truth for recall chip colour. The feed rows, the shelf
 * digest, the barcode verdict, outbreak pages and the Key legend all call these
 * functions, so the legend cannot drift from what the rows show.
 *
 * Colour means one thing: coral = most serious or active, sun = moderate or an
 * alert, pond = the USDA FSIS feed, outline/quiet = neutral.
 */
import type { ChipColor } from "@/components/ui/chip";

interface ChipStyle {
  color: ChipColor;
}

/** Map an FDA/FSIS classification to a chip colour by severity. */
export function classificationColor(c?: string): ChipColor {
  if (c === "Class I") return "coral";
  if (c === "Class III") return "outline";
  if (c === "Not Yet Classified") return "quiet";
  return "sun"; // Class II and FSIS Public Health Alert
}

export function classificationChip(c?: string): ChipStyle {
  return { color: classificationColor(c) };
}

/** Ongoing / Completed / Terminated: deliberately quiet, never severity-coloured. */
export function statusChip(_status?: string): ChipStyle {
  return { color: "quiet" };
}

export function agencyLabel(agency?: string): string {
  return agency === "FSIS" ? "USDA FSIS" : "FDA";
}

export function agencyChip(agency?: string): ChipStyle {
  return { color: agency === "FSIS" ? "pond" : "outline" };
}

/** Outbreak investigation status (Active / Resolved). Resolved is quiet, never green. */
export function outbreakStatusChip(active: boolean): ChipStyle {
  return { color: active ? "coral" : "quiet" };
}

/** The issuing agency's own one-line definition of a classification, for a chip `title`. */
export function classificationTitle(c?: string): string | undefined {
  switch (c) {
    case "Class I":
      return "FDA: reasonable probability that use will cause serious adverse health consequences or death";
    case "Class II":
      return "FDA: may cause temporary or medically reversible adverse health consequences";
    case "Class III":
      return "FDA: not likely to cause adverse health consequences";
    case "Public Health Alert":
      return "USDA FSIS: a public health concern without a formal recall";
    case "Not Yet Classified":
      return "FDA has not assigned a class yet";
    default:
      return undefined;
  }
}
