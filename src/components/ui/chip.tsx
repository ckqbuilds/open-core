import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Label chips. Colour means one thing only, severity or source, never decoration:
 * coral = most serious / active, sun = moderate / alert, pond = USDA FSIS,
 * land = CDC/FDA named source, lilac = category, outline/quiet = neutral.
 */
export type ChipColor = "coral" | "sun" | "pond" | "lilac" | "land" | "outline" | "quiet";

export function Chip({
  color = "quiet",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { color?: ChipColor; children?: ReactNode }) {
  return (
    <span {...props} className={cn("chip", `chip--${color}`, className)}>
      {children}
    </span>
  );
}
