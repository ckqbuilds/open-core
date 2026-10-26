import * as React from "react";
import { cn } from "@/lib/utils";

/** A capsule field: paper strip with an ink outline. */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn("field disabled:cursor-not-allowed disabled:opacity-50", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
