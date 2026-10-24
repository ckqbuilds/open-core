import { useState } from "react";
import { MapPin } from "lucide-react";
import type { AvoidanceEvent } from "@/data/avoidance";
import type { GeoZip } from "@/data/types";
import { cn } from "@/lib/utils";

const STATES_PREVIEW = 8;

/** Where the notice says it went, with the reader's own state answered first. */
export function ReachLine({ ev, geo }: { ev: Pick<AvoidanceEvent, "states" | "nationwide" | "distribution">; geo: GeoZip | null }) {
  const [open, setOpen] = useState(false);
  const mine = geo?.stateAbbr;
  const hasStates = ev.states.length > 0;
  if (!ev.nationwide && !hasStates) {
    return ev.distribution[0] ? (
      <p className="mt-2 text-sm text-muted-foreground">
        <MapPin className="mr-1 inline size-3.5 -translate-y-px" aria-hidden />
        {ev.distribution[0]}
      </p>
    ) : null;
  }
  const reachesMine = !!mine && (ev.nationwide || ev.states.includes(mine));
  const shown = open ? ev.states : ev.states.slice(0, STATES_PREVIEW);
  const more = ev.states.length - shown.length;

  return (
    <p className="mt-2 text-sm">
      <MapPin
        aria-hidden
        className={cn(
          "mr-1 inline size-3.5 -translate-y-px",
          reachesMine ? "text-[color:var(--status-critical)]" : "text-muted-foreground"
        )}
      />
      {mine && (
        <span className={cn("font-medium", !reachesMine && "text-muted-foreground")}>
          {reachesMine ? `Reaches ${mine}` : `${mine} not listed`}
          <span aria-hidden> · </span>
        </span>
      )}
      <span className="text-muted-foreground">
        {ev.nationwide
          ? "Distributed nationwide"
          : `Distributed in ${ev.states.length} ${ev.states.length === 1 ? "state" : "states"}: ${shown.join(", ")}`}
        {more > 0 && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex min-h-10 items-center font-medium text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              +{more} more
            </button>
          </>
        )}
      </span>
    </p>
  );
}
