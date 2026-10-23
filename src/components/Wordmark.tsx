import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** The OpenCORE wordmark: shield-check mark, "Open" medium, "CORE" semibold in accent. */
export function Wordmark({
  className,
  showMark = true,
  hideTextOnMobile = false,
}: {
  className?: string;
  showMark?: boolean;
  hideTextOnMobile?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 tracking-tight", className)}>
      {showMark && <ShieldCheck aria-hidden className="size-5 shrink-0 text-accent" />}
      <span className={cn(hideTextOnMobile && "hidden md:inline")}>
        <span className="font-medium">Open</span>
        <span className="font-semibold text-accent">CORE</span>
      </span>
    </span>
  );
}
