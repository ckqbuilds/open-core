import { Chip } from "@/components/ui/chip";
import { useState } from "react";
import { Check, Copy, Share2, Loader2, ExternalLink } from "lucide-react";
import type { Outbreak } from "@/data/types";
import { shareOrCopy } from "@/lib/share";
import { outbreakStatusChip } from "@/lib/classification";
import { formatIso, formatIsoShort, isStale, staleNotice } from "@/lib/utils";
import { CURATED_CHECKED_AT } from "@/data/outbreaks";
import { Button } from "@/components/ui/button";
import { SourceLink } from "@/components/common";
import { Digits } from "@/components/RecordLine";

function caseLabel(ob: Outbreak): string {
  return ob.caseCount != null ? ob.caseCount.toLocaleString() : ob.caseCountText ?? "See advisory";
}

function shareText(ob: Outbreak): string {
  const cases = ob.caseCount != null ? `${ob.caseCount.toLocaleString()} reported cases` : "case count via FDA advisory";
  const named = ob.namedEntities?.length
    ? ` Named in the record: ${ob.namedEntities.map((e) => e.name).join(", ")}.`
    : "";
  const src = ob.sources?.[0]?.url ?? ob.advisoryUrl ?? ob.sourceUrl ?? "";
  return `${ob.pathogen} outbreak linked to ${ob.vehicle.toLowerCase()}: ${cases}.${named} Source: ${src}`;
}

/**
 * The core outbreak record — everything CORE + the curated layer holds for one
 * outbreak. Extracted from the old modal so it can headline a full page.
 */
export function OutbreakDetail({
  outbreak: ob,
  symptomsHref,
}: {
  outbreak: Outbreak;
  /** Set only when the page renders a symptoms section to jump to. */
  symptomsHref?: string;
}) {
  const [shareState, setShareState] = useState<"idle" | "busy" | "shared" | "copied">("idle");

  const onShare = async () => {
    setShareState("busy");
    const result = await shareOrCopy({
      title: `${ob.pathogen} outbreak — ${ob.vehicle}`,
      text: shareText(ob),
      url: ob.sources?.[0]?.url ?? ob.advisoryUrl ?? ob.sourceUrl,
    });
    if (result === "shared") setShareState("shared");
    else if (result === "copied") setShareState("copied");
    else setShareState("idle");
    if (result === "shared" || result === "copied") setTimeout(() => setShareState("idle"), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip key="status" {...outbreakStatusChip(ob.status === "active")}>
            {ob.status === "active"
              ? ob.curated
                ? `Active as of ${formatIsoShort(CURATED_CHECKED_AT)}`
                : "Active"
              : "Resolved"}
          </Chip>
          <Chip key="pathogen" color="outline">
            {ob.pathogen}
          </Chip>
          {ob.refId && (
            <Chip key="ref" color="quiet" className="tnum font-mono">
              FDA #{ob.refId}
            </Chip>
          )}
        </div>
        <h1 className="display mt-4 text-4xl sm:text-5xl">
          {ob.pathogen} outbreak
          {ob.vehicle !== "Not yet identified" ? ` linked to ${ob.vehicle.toLowerCase()}` : ""}
        </h1>
        <p className="mt-3 text-base text-ink-2">
          <Digits>
            {ob.detailed
              ? `Illness onset ${formatIso(ob.firstIllnessDate)} – ${formatIso(ob.lastIllnessDate)}`
              : `Posted ${formatIso(ob.datePosted)} · ${ob.eventStatus ?? "Ongoing"}`}
          </Digits>
        </p>
        {ob.curated && (
          <p className="prose-measure mt-2 text-xs text-ink-2" role="status">
            Live FDA feed unavailable · showing the curated list last checked{" "}
            {formatIsoShort(CURATED_CHECKED_AT)}; this status may be out of date.
          </p>
        )}
        {ob.detailed && ob.guidance && symptomsHref && (
          <a href={symptomsHref} className="capsule capsule--sun mt-4 max-w-full whitespace-normal text-left">
            If you have eaten this: see the symptoms and what to do
          </a>
        )}
      </div>

      <p className="border-y-2 border-ink py-3 text-base">
        {ob.detailed ? (
          <>
            <b className="font-extrabold">
              <Digits>{caseLabel(ob)}</Digits>
            </b>{" "}
            reported cases ·{" "}
            <b className="font-extrabold">
              <Digits>{String(ob.hospitalizations ?? "—")}</Digits>
            </b>{" "}
            hospitalized ·{" "}
            <b className="font-extrabold">
              <Digits>{String(ob.deaths ?? "—")}</Digits>
            </b>{" "}
            deaths ·{" "}
            <b className="font-extrabold">
              <Digits>{String(ob.statesAffectedCount ?? "—")}</Digits>
            </b>{" "}
            states
          </>
        ) : (
          <>
            <b className="font-extrabold">
              <Digits>{caseLabel(ob)}</Digits>
            </b>{" "}
            reported cases · suspected food: <b className="font-extrabold">{ob.vehicle}</b>
          </>
        )}
      </p>

      {ob.detailed && ob.guidance && (
        <div>
          <h2 className="display-md mb-3 text-2xl">What to know</h2>
          <ul className="prose-measure space-y-2">
            {ob.guidance.map((g, i) => (
              <li key={i} className="flex gap-3 text-base">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-ink" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
          {isStale(ob.lastIllnessDate) && (
            <p className="mt-3 text-xs text-ink-2">{staleNotice(ob.lastIllnessDate)}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
        <div className="flex min-w-0 flex-1 basis-64 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {ob.sources?.map((s) => <SourceLink key={s.url} source={s} />)}
          {ob.advisoryUrl && (
            <a
              href={ob.advisoryUrl}
              target="_blank"
              rel="noreferrer"
              className="link inline-flex items-center gap-1"
            >
              <ExternalLink className="size-3" /> FDA advisory
            </a>
          )}
        </div>
        <Button size="sm" onClick={onShare} disabled={shareState === "busy"}>
          {shareState === "busy" && <Loader2 className="animate-spin" />}
          {shareState === "idle" && <Share2 />}
          {shareState === "shared" && <Check />}
          {shareState === "copied" && <Copy />}
          {shareState === "copied" ? "Copied" : shareState === "shared" ? "Shared" : "Share"}
        </Button>
      </div>
    </div>
  );
}

/** Companies the official record names, or the honest "not compiled yet" note. */
export function NamedInRecord({ outbreak: ob }: { outbreak: Outbreak }) {
  return (
    ob.detailed && ob.namedEntities ? (
        <div>
          <h2 className="display-md text-2xl">Named in the official record</h2>
          <p className="prose-measure mt-2 text-sm text-ink-2">
            Only companies FDA or CDC named — or that sell a recalled branded product. Not a list of
            "unsafe stores."
          </p>
          <div className="mt-3">
            {ob.namedEntities.map((e) => (
              <div key={e.id} className="row-rule py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-extrabold">{e.name}</span>
                  <Chip color="outline">
                    {e.kind === "restaurant"
                      ? "Restaurant"
                      : /^recalling firm/i.test(e.note)
                        ? "Recalling firm"
                        : "Retailer / supplier"}
                  </Chip>
                  {e.product && <Chip color="quiet">{e.product}</Chip>}
                </div>
                <p className="prose-measure mt-1.5 text-sm text-ink-2">{e.note}</p>
                <div className="mt-1.5">
                  <SourceLink source={e.source} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="sheet sheet--quiet p-4 text-sm text-ink-2">
          This outbreak is tracked live from the FDA CORE table. Detailed named entities and guidance
          haven't been compiled for it yet — open the FDA investigation for the latest official
          information, including any advice and recalls.
          {ob.recallInitiated && (
            <span className="mt-1 block font-bold text-ink">
              A recall has been initiated for this investigation.
            </span>
          )}
        </div>
      )
  );
}
