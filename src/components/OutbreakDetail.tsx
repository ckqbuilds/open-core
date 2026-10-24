import { Chip } from "@/components/ui/chip";
import { useState } from "react";
import { Check, Copy, Share2, Loader2, ExternalLink } from "lucide-react";
import type { Outbreak } from "@/data/types";
import { shareOrCopy } from "@/lib/share";
import { outbreakStatusChip } from "@/lib/classification";
import { formatIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { SourceLink } from "@/components/common";

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
export function OutbreakDetail({ outbreak: ob }: { outbreak: Outbreak }) {
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
          <Chip key="status" {...outbreakStatusChip(ob.status === "active")} size="sm">
            {ob.status === "active" ? "Active" : "Resolved"}
          </Chip>
          <Chip key="pathogen" color="default" variant="tertiary" size="sm">
            {ob.pathogen}
          </Chip>
          {ob.refId && (
            <Chip key="ref" color="default" variant="soft" size="sm" className="font-mono tabular-nums">
              FDA #{ob.refId}
            </Chip>
          )}
        </div>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight">
          {ob.pathogen} outbreak
          {ob.vehicle !== "Not yet identified" ? ` linked to ${ob.vehicle.toLowerCase()}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ob.detailed
            ? `Illness onset ${formatIso(ob.firstIllnessDate)} – ${formatIso(ob.lastIllnessDate)}`
            : `Posted ${formatIso(ob.datePosted)} · ${ob.eventStatus ?? "Ongoing"}`}
        </p>
      </div>

      {ob.detailed ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Reported cases" value={caseLabel(ob)} tone="critical" />
          <StatCard label="Hospitalizations" value={ob.hospitalizations ?? "—"} />
          <StatCard label="Deaths" value={ob.deaths ?? "—"} />
          <StatCard label="States affected" value={ob.statesAffectedCount ?? "—"} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Reported cases" value={caseLabel(ob)} tone="critical" />
          <StatCard label="Suspected food" value={<span className="text-xl">{ob.vehicle}</span>} />
        </div>
      )}

      {ob.detailed && ob.guidance && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">What to know</h2>
          <ul className="space-y-1.5">
            {ob.guidance.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex min-w-0 flex-1 basis-64 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {ob.sources?.map((s) => <SourceLink key={s.url} source={s} />)}
          {ob.advisoryUrl && (
            <a
              href={ob.advisoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" /> FDA advisory
            </a>
          )}
        </div>
        <Button size="sm" onClick={onShare} disabled={shareState === "busy"}>
          {shareState === "busy" && <Loader2 className="size-4 animate-spin" />}
          {shareState === "idle" && <Share2 className="size-4" />}
          {shareState === "shared" && <Check className="size-4" />}
          {shareState === "copied" && <Copy className="size-4" />}
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
          <h2 className="mb-1 text-sm font-semibold">Named in the official record</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Only companies FDA or CDC named — or that sell a recalled branded product. Not a list of
            "unsafe stores."
          </p>
          <div className="space-y-2">
            {ob.namedEntities.map((e) => (
              <div key={e.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{e.name}</span>
                  <Chip color="default" variant="tertiary" size="sm">
                    {e.kind === "restaurant" ? "Restaurant" : "Retailer / supplier"}
                  </Chip>
                  {e.product && <Chip color="default" variant="soft" size="sm">{e.product}</Chip>}
                </div>
                <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{e.note}</p>
                <div className="mt-1.5">
                  <SourceLink source={e.source} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          This outbreak is tracked live from the FDA CORE table. Detailed named entities and guidance
          haven't been compiled for it yet — open the FDA investigation for the latest official
          information, including any advice and recalls.
          {ob.recallInitiated && (
            <span className="mt-1 block font-medium text-foreground">
              A recall has been initiated for this investigation.
            </span>
          )}
        </div>
      )
  );
}
