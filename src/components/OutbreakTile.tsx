import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Digits } from "@/components/RecordLine";
import type { Outbreak } from "@/data/types";
import { formatIso, formatIsoShort } from "@/lib/utils";
import { CURATED_CHECKED_AT } from "@/data/outbreaks";

const ROW_GRID = "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_1.5rem]";

/** Column labels for the outbreak rows, on the same grid. Hidden on phones. */
export function OutbreakRowHeader() {
  return (
    <div
      aria-hidden
      className={`hidden gap-x-6 border-b-2 border-ink px-1 pb-2 text-xs font-bold text-ink-2 md:grid ${ROW_GRID}`}
    >
      <span>Outbreak</span>
      <span>Status</span>
      <span>Cases and dates</span>
      <span />
    </div>
  );
}

/** One outbreak as a ruled row; the whole row is the link to its page. */
export function OutbreakRow({ outbreak: ob }: { outbreak: Outbreak }) {
  const cases = ob.caseCount != null ? ob.caseCount.toLocaleString() : ob.caseCountText ?? "See advisory";
  return (
    <Link
      to={`/outbreak/${ob.refId ?? ob.id}`}
      className="row-rule group grid gap-x-6 gap-y-1.5 px-1 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_1.5rem] md:items-center"
    >
      <div className="min-w-0">
        <div className="text-lg font-extrabold leading-tight">{ob.pathogen}</div>
        <div className="text-sm text-ink-2">{ob.vehicle}</div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip color="coral">{ob.curated ? `Active as of ${formatIsoShort(CURATED_CHECKED_AT)}` : "Active"}</Chip>
        {ob.detailed ? <Chip color="land">Hand-verified detail</Chip> : <Chip color="quiet">FDA table only</Chip>}
      </div>

      <p className="min-w-0 text-sm">
        {ob.detailed ? (
          <>
            <b className="font-extrabold">
              <Digits>{cases}</Digits>
            </b>{" "}
            cases
            {ob.statesAffectedCount != null && (
              <>
                {" "}
                ·{" "}
                <b className="font-extrabold">
                  <Digits>{String(ob.statesAffectedCount)}</Digits>
                </b>{" "}
                states
              </>
            )}{" "}
            ·{" "}
            <span className="text-ink-2">
              <Digits>{`onset ${formatIso(ob.firstIllnessDate)} – ${formatIso(ob.lastIllnessDate)}`}</Digits>
            </span>
          </>
        ) : (
          <>
            <b className="font-extrabold">
              <Digits>{cases}</Digits>
            </b>{" "}
            cases ·{" "}
            <span className="text-ink-2">
              <Digits>{`FDA #${ob.refId} · posted ${formatIso(ob.datePosted)}`}</Digits>
            </span>
          </>
        )}
      </p>

      <ArrowRight
        className="hidden size-5 shrink-0 transition-transform ease-over group-hover:translate-x-1 md:block"
        aria-hidden
      />
    </Link>
  );
}

export { OutbreakRow as OutbreakTile };
