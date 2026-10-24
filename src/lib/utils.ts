import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Validate a US 5-digit ZIP. */
export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

/** Format an ISO date (YYYY-MM-DD) as a readable date; "—" when missing/invalid. */
export function formatIso(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Format an FDA YYYYMMDD string as a readable date. */
export function formatFdaDate(raw?: string): string {
  if (!raw || raw.length !== 8) return "—";
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STALE_DAYS = 60;

/** Parse YYYYMMDD or an ISO date into a Date, or null. */
function parseRecordDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const d = /^\d{8}$/.test(raw)
    ? new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00`)
    : new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when the record's date is more than 60 days before today. */
export function isStale(raw?: string | null): boolean {
  const d = parseRecordDate(raw);
  return !!d && Date.now() - d.getTime() > STALE_DAYS * 86400000;
}

/** One factual line for notices whose date is old; no advice beyond what the record supports. */
export function staleNotice(raw?: string | null): string {
  const d = parseRecordDate(raw);
  const when = d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "an earlier date";
  return `This notice is from ${when}. Dates it names may have passed; recalled product can remain in homes.`;
}
