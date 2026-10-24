import { cn } from "@/lib/utils";

/**
 * The OpenCORE wordmark. The mark is the record: a small green lobe with two
 * ink lines, the guide map's "you are here" standing in for "what the record
 * says". Never a shield: a shield-check would read as "verified safe".
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 28 28" className={cn("size-7 shrink-0", className)}>
      <path
        d="M14 2.5c6.4-.4 11.6 4.2 11.3 10.6-.3 6.6-4.6 12.4-11.7 12.4C6.9 25.5 2.3 20.4 2.6 13.6 2.9 7.3 7.9 2.9 14 2.5Z"
        fill="var(--land)"
      />
      <path d="M8.5 11.5h11M8.5 16.5h7" stroke="#2c2e2a" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className, showMark = true }: { className?: string; showMark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[1.35rem] font-extrabold leading-none tracking-[-0.04em]", className)}>
      {showMark && <Mark />}
      <span>OpenCORE</span>
    </span>
  );
}
