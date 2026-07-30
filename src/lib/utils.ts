import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Validate a US 5-digit ZIP. */
export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
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
