import type { Recall } from "./types";

/** The default "current" view: Ongoing notices reported within this many days. */
export const CURRENT_DAYS = 90;

/** YYYYMMDD cutoff for the current view, computed at call time. */
export function currentCutoff(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - CURRENT_DAYS);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * True when a notice belongs in the current view. Every surface that says
 * "right now" counts with this one rule, so the home hero and the recalls
 * page can never disagree.
 */
export function isCurrentNotice(r: Recall, cutoff = currentCutoff()): boolean {
  return r.status === "Ongoing" && (r.reportDate ?? r.recallInitiationDate ?? "") >= cutoff;
}
