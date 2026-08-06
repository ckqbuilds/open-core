import { Card, Chip } from "@heroui/react";
import { ExternalLink, Lightbulb } from "lucide-react";
import type { Outbreak, SourceCitation } from "@/data/types";
import type { Pathogen } from "@/data/symptoms";
import { extractSerotype, fetchSerotypeContext } from "@/data/beam";
import { fetchPathogenHistory } from "@/data/nors";
import { useAsync } from "@/hooks/useAsync";
import { SourceLink } from "@/components/common";
import { Sparkline } from "@/components/Sparkline";

/**
 * Plain-English grounding block for an outbreak. It de-scares the cryptic
 * serotype name — a name like "Salmonella Oranienburg" is a lab FINGERPRINT
 * used to trace one outbreak to a source, NOT a different or scarier illness —
 * and adds SOURCED CDC BEAM surveillance history for which foods the serotype
 * has been linked to. Honest copy only: it never claims a food or product is
 * "safe", and every number is cited to CDC.
 */
export function OutbreakGrounding({
  outbreak,
  pathogen,
}: {
  outbreak: Outbreak;
  pathogen: Pathogen | null;
}) {
  const serotype = extractSerotype(outbreak.pathogen, pathogen);

  // BEAM's fvm6-ic5r dataset only covers Salmonella serotypes, so only fetch
  // when this is a matched Salmonella outbreak with a serotype to look up.
  const beamEnabled = pathogen?.id === "salmonella" && serotype != null;
  const beam = useAsync(
    (signal) => fetchSerotypeContext(serotype ?? "", signal),
    [serotype],
    beamEnabled
  );
  const context = beamEnabled ? beam.data : null;

  // NORS historical base rates apply to ANY matched pathogen with a NORS term
  // (broader than the Salmonella-only BEAM layer). Null term / no rows → the
  // hook resolves to null and the band below is omitted.
  const history = useAsync(
    (signal) => fetchPathogenHistory(pathogen?.id ?? "", signal),
    [pathogen?.id],
    pathogen != null
  );

  return (
    <Card className="border-accent/30 bg-accent/5 p-5">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-4 text-primary" />
        <h2 className="text-lg font-semibold">Understanding this outbreak</h2>
      </div>

      <div className="mt-3 space-y-3 text-sm text-muted-foreground">
        {serotype ? (
          <p>
            <span className="font-medium text-foreground">“{serotype}”</span> is the specific
            strain — a lab fingerprint scientists use to trace this outbreak to one source. It is
            not a different or more dangerous illness: it causes{" "}
            <span className="font-medium text-foreground">
              {pathogen?.aka ?? "the same illness"}
            </span>
            , with the same symptoms and care as any {pathogen?.name ?? "case"}.
          </p>
        ) : (
          <p>
            {pathogen?.summary ??
              "This page pulls together what the official record says about this outbreak — the illness it causes, and where to read the FDA/CDC investigation."}
          </p>
        )}

        {serotype && pathogen?.summary && (
          <p>{pathogen.summary}</p>
        )}

        {context && (
          <div className="space-y-2 border-t border-accent/20 pt-3">
            <p className="text-xs font-medium text-foreground">
              Where this strain usually shows up (CDC surveillance history — not this outbreak’s
              counts):
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {context.topFoods.map((f) => (
                <Chip key={f.food} color="default" variant="soft" size="sm">
                  {f.food} · {f.illnesses.toLocaleString()} illnesses
                </Chip>
              ))}
            </div>
            <a
              href={context.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              CDC BEAM Dashboard
            </a>
          </div>
        )}

        {history.data && (
          <div className="space-y-2 border-t border-accent/20 pt-3">
            <p className="text-xs font-medium text-foreground">How common is this?</p>
            <p>
              CDC records about{" "}
              <span className="font-medium text-foreground">
                {history.data.avgOutbreaksPerYear}
              </span>{" "}
              {pathogen?.name} foodborne outbreaks a year on average (
              {history.data.firstYear}–{history.data.lastYear}), around{" "}
              <span className="font-medium text-foreground">
                {history.data.avgIllnessesPerYear.toLocaleString()}
              </span>{" "}
              illnesses/year.
            </p>
            <Sparkline
              values={history.data.recent.map((r) => r.outbreaks)}
              ariaLabel={`${pathogen?.name} foodborne outbreaks per year, ${history.data.firstYear}–${history.data.lastYear}`}
            />
            <p className="text-xs text-muted-foreground">
              reported outbreaks/yr · last 10 years
            </p>
            <a
              href={history.data.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              CDC NORS (historical, finalized annual figures — not this outbreak’s counts)
            </a>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-accent/20 pt-3 text-xs">
          <span className="text-muted-foreground">Read the official FDA/CDC investigation:</span>
          {outbreak.sources?.map((s: SourceCitation) => (
            <SourceLink key={s.url} source={s} />
          ))}
          {outbreak.advisoryUrl && (
            <a
              href={outbreak.advisoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" /> FDA advisory
            </a>
          )}
          {!outbreak.advisoryUrl && !outbreak.sources?.length && outbreak.sourceUrl && (
            <a
              href={outbreak.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" /> FDA CORE table
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
