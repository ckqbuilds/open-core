import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipColor = "default" | "accent" | "danger" | "warning" | "success";
export type ChipVariant = "soft" | "tertiary" | "primary" | "secondary";
export type ChipSize = "sm" | "md" | "lg";

/**
 * Same API and CSS as HeroUI's `Chip`, with the class list built here instead
 * of through HeroUI's tailwind-variants call. tailwind-variants 3.3.0 (pinned
 * under @heroui) returns one shared slot function for every `chipVariants()`
 * call, so on a re-render a memoised chip reads whichever chip's props were
 * computed last and three sibling chips all turn "default". Building the
 * classes directly makes the colour deterministic.
 */
export function Chip({
  color = "default",
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  color?: ChipColor;
  variant?: ChipVariant;
  size?: ChipSize;
  children?: ReactNode;
}) {
  return (
    <span
      {...props}
      data-slot="chip"
      className={cn("chip", `chip--${color}`, `chip--${size}`, `chip--${variant}`, className)}
    >
      <span data-slot="chip-label" className="chip__label">
        {children}
      </span>
    </span>
  );
}
