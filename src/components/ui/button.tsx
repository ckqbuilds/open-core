import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "ink" | "sun" | "coral" | "pond" | "lilac" | "land" | "ghost";
export type ButtonSize = "default" | "sm";

const VARIANT: Record<ButtonVariant, string> = {
  default: "",
  ink: "capsule--ink",
  sun: "capsule--sun",
  coral: "capsule--coral",
  pond: "capsule--pond",
  lilac: "capsule--lilac",
  land: "capsule--land",
  ghost: "capsule--ghost",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show the round chip on the trailing edge; `live` moves it to the lead. */
  chip?: boolean;
  live?: boolean;
}

/** Every button in the app is a capsule: ink outline on paper, or one flat fill. */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, chip, live, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "capsule [&_svg]:size-4 [&_svg]:shrink-0",
          VARIANT[variant],
          size === "sm" && "capsule--sm",
          live && "is-live",
          className
        )}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {children}
            {chip && <span aria-hidden className="capsule__chip" />}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button };
