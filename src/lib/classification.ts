/**
 * Single source of truth for recall chip styling. The feed rows, the shelf
 * digest, the barcode verdict, outbreak pages and the Key legend all call these
 * functions, so the legend cannot drift from what the rows show.
 */
export type ChipColor = "danger" | "warning" | "default" | "success" | "accent";
export type ChipVariant = "soft" | "tertiary";

interface ChipStyle {
  color: ChipColor;
  variant: ChipVariant;
}

/** Map an FDA/FSIS classification to a chip color by severity. */
export function classificationColor(c?: string): ChipColor {
  if (c === "Class I") return "danger";
  if (c === "Class III") return "default";
  return "warning"; // Class II and FSIS Public Health Alert
}

export function classificationChip(c?: string): ChipStyle {
  return { color: classificationColor(c), variant: "soft" };
}

/** Ongoing / Completed / Terminated: deliberately quiet, never severity-coloured. */
export function statusChip(_status?: string): ChipStyle {
  return { color: "default", variant: "tertiary" };
}

export function agencyLabel(agency?: string): string {
  return agency === "FSIS" ? "USDA FSIS" : "FDA";
}

export function agencyChip(agency?: string): ChipStyle {
  return { color: agency === "FSIS" ? "accent" : "default", variant: "soft" };
}

/** Outbreak investigation status (Active / Resolved). */
export function outbreakStatusChip(active: boolean): ChipStyle {
  return { color: active ? "danger" : "success", variant: "soft" };
}
