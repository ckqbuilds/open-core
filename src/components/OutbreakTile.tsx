import { Link } from "react-router-dom";
import { ChevronRight, Users, MapPin } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import type { Outbreak } from "@/data/types";
import { formatIso } from "@/lib/utils";

/** Compact outbreak summary — the whole HeroUI card is the link to its page. */
export function OutbreakTile({ outbreak: ob }: { outbreak: Outbreak }) {
  const cases =
    ob.caseCount != null ? ob.caseCount.toLocaleString() : ob.caseCountText ?? "See advisory";
  const to = `/outbreak/${ob.refId ?? ob.id}`;

  return (
    <Card
      // Card defaults to a <div>; render its root as the router Link. The
      // provided domProps are typed for a div, so cast when handing them to Link.
      render={(domProps) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Link {...(domProps as any)} to={to} aria-label={`View details: ${ob.pathogen} outbreak`} />
      )}
      className="group flex h-full flex-col gap-3 p-5 transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip color="danger" variant="soft" size="sm">
            Active
          </Chip>
          {ob.detailed && (
            <Chip color="default" variant="soft" size="sm">
              Detailed
            </Chip>
          )}
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div>
        <div className="font-semibold leading-tight">{ob.pathogen}</div>
        <div className="text-sm text-muted-foreground">{ob.vehicle}</div>
      </div>

      <div className="mt-auto space-y-1 pt-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            <span className="font-medium tabular-nums text-foreground">{cases}</span> cases
          </span>
          {ob.detailed && ob.statesAffectedCount != null && (
            <span className="flex items-center gap-1.5 tabular-nums">
              <MapPin className="size-4" /> {ob.statesAffectedCount} states
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {ob.detailed
            ? `Onset ${formatIso(ob.firstIllnessDate)}–${formatIso(ob.lastIllnessDate)}`
            : `FDA #${ob.refId} · posted ${formatIso(ob.datePosted)}`}
        </div>
      </div>
    </Card>
  );
}
