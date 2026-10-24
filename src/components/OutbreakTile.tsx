import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import type { Outbreak } from "@/data/types";
import { formatIso, formatIsoShort } from "@/lib/utils";
import { CURATED_CHECKED_AT } from "@/data/outbreaks";

/** One outbreak as an outlined sheet; the whole sheet is the link to its page. */
export function OutbreakTile({ outbreak: ob }: { outbreak: Outbreak }) {
  const cases = ob.caseCount != null ? ob.caseCount.toLocaleString() : ob.caseCountText ?? "See advisory";
  return (
    <Link
      to={`/outbreak/${ob.refId ?? ob.id}`}
      className="sheet group flex h-full flex-col gap-4 p-5 transition-transform ease-over hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip color="coral">{ob.curated ? `Active as of ${formatIsoShort(CURATED_CHECKED_AT)}` : "Active"}</Chip>
          {ob.detailed ? <Chip color="land">Hand-verified detail</Chip> : <Chip color="quiet">FDA table only</Chip>}
        </div>
        <ArrowRight className="size-5 shrink-0 transition-transform ease-over group-hover:translate-x-1" aria-hidden />
      </div>

      <div>
        <div className="display-md text-2xl">{ob.pathogen}</div>
        <div className="mt-1 text-base text-ink-2">{ob.vehicle}</div>
      </div>

      <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div>
          <dt className="sr-only">Reported cases</dt>
          <dd>
            <span className="tnum text-xl font-extrabold">{cases}</span> <span className="text-ink-2">cases</span>
          </dd>
        </div>
        {ob.detailed && ob.statesAffectedCount != null && (
          <div>
            <dt className="sr-only">States affected</dt>
            <dd>
              <span className="tnum text-xl font-extrabold">{ob.statesAffectedCount}</span>{" "}
              <span className="text-ink-2">states</span>
            </dd>
          </div>
        )}
        <div className="tnum basis-full text-xs text-ink-2">
          {ob.detailed
            ? `Onset ${formatIso(ob.firstIllnessDate)} – ${formatIso(ob.lastIllnessDate)}`
            : `FDA #${ob.refId} · posted ${formatIso(ob.datePosted)}`}
          {ob.detailed && ob.datePosted && ` · posted ${formatIso(ob.datePosted)}`}
        </div>
      </dl>
    </Link>
  );
}
