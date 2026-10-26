import { Chip } from "@/components/ui/chip";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { Outbreak, SourceCitation } from "@/data/types";
import type { Pathogen } from "@/data/symptoms";
import { classifyOutbreak } from "@/data/contaminants";
import { extractSerotype, fetchSerotypeContext } from "@/data/beam";
import { fetchPathogenHistory } from "@/data/nors";
import { useAsync } from "@/hooks/useAsync";
import { Sparkline } from "@/components/Sparkline";
import { Sheet } from "@/components/common";

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

  // Each distinct source once, by URL. The per-entity record lines carry the
  // full citations; this is only the pointer to the investigation itself.
  const investigationLinks: { url: string; label: string }[] = [];
  const addLink = (url: string | null | undefined, label: string) => {
    if (url && !investigationLinks.some((l) => l.url === url)) investigationLinks.push({ url, label });
  };
  outbreak.sources?.forEach((x: SourceCitation) => addLink(x.url, `${x.agency} source`));
  addLink(outbreak.advisoryUrl, "FDA advisory");
  if (!outbreak.advisoryUrl && !outbreak.sources?.length) addLink(outbreak.sourceUrl, "FDA CORE table");

  const subBlock = "space-y-2 border-t border-dotted border-rule pt-4";

  return (
    <Sheet className="p-5 sm:p-6">
      <h2 className="display-md text-2xl">Understanding this outbreak</h2>

      <div className="prose-measure mt-4 space-y-3 text-base">
        {serotype ? (
          <p>
            <span className="font-bold">“{serotype}”</span> is the specific
            strain — a lab fingerprint scientists use to trace this outbreak to one source. It is
            not a different or more dangerous illness: it causes{" "}
            <span className="font-bold">{pathogen?.aka ?? "the same illness"}</span>
            , with the same symptoms and care as any {pathogen?.name ?? "case"}.
          </p>
        ) : (
          <p>
            {pathogen?.summary ??
              "This page pulls together what the official record says about this outbreak — the illness it causes, and where to read the FDA/CDC investigation."}
          </p>
        )}

        {serotype && pathogen?.summary && <p>{pathogen.summary}</p>}

        {pathogen && (
          <p>
            This is a <span className="font-bold">biological</span> contaminant
            {classifyOutbreak(pathogen).subtype && (
              <>
                {" "}
                — a <span className="italic">{classifyOutbreak(pathogen).subtype}</span>
              </>
            )}
            .{" "}
            <Link to="/learn" className="link">
              How contamination types work
            </Link>
            .
          </p>
        )}

        {context && (
          <div className={subBlock}>
            <p className="text-sm font-bold">
              Where this strain usually shows up (CDC surveillance history — not this outbreak’s
              counts):
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {context.topFoods.map((f) => (
                <Chip key={f.food} color="quiet">
                  {f.food} · {f.illnesses.toLocaleString()} illnesses
                </Chip>
              ))}
            </div>
            <a href={context.sourceUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 text-sm">
              <ExternalLink className="size-3" />
              CDC BEAM Dashboard
            </a>
          </div>
        )}

        {history.data && (
          <div className={subBlock}>
            <p className="text-sm font-bold">How common is this?</p>
            <p>
              CDC records about <span className="font-bold">{history.data.avgOutbreaksPerYear}</span>{" "}
              {pathogen?.name} foodborne outbreaks a year on average (
              {history.data.firstYear}–{history.data.lastYear}), around{" "}
              <span className="font-bold">{history.data.avgIllnessesPerYear.toLocaleString()}</span>{" "}
              illnesses/year.
            </p>
            <Sparkline
              values={history.data.recent.map((r) => r.outbreaks)}
              ariaLabel={`${pathogen?.name} foodborne outbreaks per year, ${history.data.firstYear}–${history.data.lastYear}`}
            />
            <p className="text-xs text-ink-2">reported outbreaks/yr · last 10 years</p>
            <a href={history.data.sourceUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 text-sm">
              <ExternalLink className="size-3" />
              CDC NORS (historical, finalized annual figures — not this outbreak’s counts)
            </a>
          </div>
        )}

        <p className="border-t border-dotted border-rule pt-4 text-sm">
          <span className="text-ink-2">Official investigation: </span>
          {investigationLinks.map((l, i) => (
            <span key={l.url}>
              {i > 0 && <span className="text-ink-2"> · </span>}
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="link inline-flex items-center gap-1 pointer-coarse:min-h-10"
              >
                <ExternalLink className="size-3" /> {l.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </Sheet>
  );
}
