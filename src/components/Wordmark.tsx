import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

/** The OpenCORE wordmark: record mark, "Open" medium, "CORE" semibold in accent. */
export function Wordmark({
  className,
  showMark = true,
}: {
  className?: string;
  showMark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 tracking-tight", className)}>
      {showMark && <ScrollText aria-hidden className="size-5 shrink-0 text-accent" />}
      <span>
        <span className="font-medium">Open</span>
        <span className="font-semibold text-accent">CORE</span>
      </span>
    </span>
  );
}
