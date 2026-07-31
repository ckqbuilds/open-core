import { Link } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import type { Outbreak } from "@/data/types";
import { formatIso } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Compact outbreak summary — links to the full per-outbreak page. */
export function OutbreakTile({ outbreak: ob }: { outbreak: Outbreak }) {
  const cases = ob.caseCount != null ? ob.caseCount.toLocaleString() : ob.caseCountText ?? "See advisory";
  return (
    <Link
      to={`/outbreak/${ob.refId ?? ob.id}`}
      className="group flex flex-col rounded-lg border border-[var(--status-critical)]/30 bg-card p-4 text-left transition-colors hover:border-[var(--status-critical)]/60 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View details: ${ob.pathogen} outbreak`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="critical">Active</Badge>
          {ob.detailed && <Badge variant="secondary">Detailed</Badge>}
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-2 font-semibold leading-tight">{ob.pathogen}</div>
      <div className="text-sm text-muted-foreground">{ob.vehicle}</div>
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="size-4" />
          <span className="font-medium tabular-nums text-foreground">{cases}</span> cases
        </span>
        {ob.detailed && ob.statesAffectedCount != null && (
          <span className="tabular-nums">{ob.statesAffectedCount} states</span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {ob.detailed
          ? `Onset ${formatIso(ob.firstIllnessDate)}–${formatIso(ob.lastIllnessDate)}`
          : `FDA #${ob.refId} · posted ${formatIso(ob.datePosted)}`}
      </div>
      <div className="mt-3 text-xs font-medium text-primary">View outbreak →</div>
    </Link>
  );
}
