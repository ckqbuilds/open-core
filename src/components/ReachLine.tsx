import { useState } from "react";
import { MapPin } from "lucide-react";
import type { AvoidanceEvent } from "@/data/avoidance";
import type { GeoZip } from "@/data/types";
import { cn } from "@/lib/utils";

const STATES_PREVIEW = 8;

/**
 * Where the notice says it went, with the reader's own state answered first.
 * Weight means one thing here: bold when it reaches you, quiet when it does not.
 */
export function ReachLine({
  ev,
  geo,
  className,
}: {
  ev: Pick<AvoidanceEvent, "states" | "nationwide" | "distribution">;
  geo: GeoZip | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const mine = geo?.stateAbbr;
  const hasStates = ev.states.length > 0;
  if (!ev.nationwide && !hasStates) {
    return ev.distribution[0] ? (
      <p className={cn("text-sm text-ink-2", className)}>
        <MapPin className="mr-1 inline size-3.5 -translate-y-px" aria-hidden />
        {ev.distribution[0]}
      </p>
    ) : null;
  }
  const reachesMine = !!mine && (ev.nationwide || ev.states.includes(mine));
  const shown = open ? ev.states : ev.states.slice(0, STATES_PREVIEW);
  const more = ev.states.length - shown.length;

  return (
    <p className={cn("text-sm", className)}>
      <MapPin aria-hidden className={cn("mr-1 inline size-3.5 -translate-y-px", !reachesMine && "text-ink-2")} />
      {mine && (
        <span className={cn(reachesMine ? "font-extrabold" : "font-semibold text-ink-2")}>
          {reachesMine ? `Reaches ${mine}` : `${mine} not listed`}
          <span aria-hidden> · </span>
        </span>
      )}
      <span className="text-ink-2">
        {ev.nationwide
          ? "Distributed nationwide"
          : `Distributed in ${ev.states.length} ${ev.states.length === 1 ? "state" : "states"}: ${shown.join(", ")}`}
        {more > 0 && (
          <>
            {" "}
            <button type="button" onClick={() => setOpen(true)} className="link inline-flex min-h-9 items-center">
              +{more} more
            </button>
          </>
        )}
      </span>
    </p>
  );
}
