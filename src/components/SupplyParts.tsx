import { Chip } from "@/components/ui/chip";
import { RecordLine } from "@/components/RecordLine";
import { HAZARD_ICONS } from "@/lib/icons";
import { classificationChip, classificationTitle, statusChip } from "@/lib/classification";
import { cn, formatIso } from "@/lib/utils";
import { possessive, type ChainRecall, type PlantInfo } from "@/data/supplyChain";

/** What was found, as a lilac hazard chip (severity alone owns coral). */
export function HazardChip({ recall, className }: { recall: ChainRecall; className?: string }) {
  const Icon = HAZARD_ICONS[recall.hazardType];
  return (
    <Chip color={recall.hazardType === "other" ? "quiet" : "lilac"} className={className}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {recall.hazardLabel}
    </Chip>
  );
}

/** Severity chip: FDA/FSIS class, or an outbreak investigation (coral, like an active outbreak). */
export function SeverityChip({ recall }: { recall: ChainRecall }) {
  const outbreak = recall.classification === "Outbreak investigation";
  return (
    <Chip color={outbreak ? "coral" : classificationChip(recall.classification).color} title={classificationTitle(recall.classification)}>
      {outbreak ? "Outbreak" : recall.classification}
    </Chip>
  );
}

/** Plant numbers as small outlined tags, in the form the notice prints them. */
export function PlantNumbers({ establishments, className }: { establishments: string[]; className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {establishments.map((e) => (
        <span key={e} className="chip chip--outline px-1.5 py-0 font-mono text-[0.68rem] font-semibold">
          {e}
        </span>
      ))}
    </span>
  );
}

/** A small drawing of the round USDA mark of inspection with the plant number in it. */
export function MiniStamp({ establishment, className }: { establishment: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-14 shrink-0 place-content-center gap-px rounded-full border-2 border-ink text-center text-[0.42rem] font-bold uppercase leading-tight tracking-wide",
        className
      )}
    >
      <span>USDA</span>
      <span className="font-mono text-[0.6rem] normal-case tracking-normal">{establishment}</span>
      <span>Inspected</span>
    </span>
  );
}

/** Ties a plant's number to the supplier that runs it, in plain words. */
export function PlantTie({ plant }: { plant: PlantInfo }) {
  const many = plant.establishments.length > 1;
  return (
    <div className="flex items-center gap-3 text-sm">
      <MiniStamp establishment={plant.establishments[plant.establishments.length - 1]} />
      <p>
        <strong>{plant.owner}</strong> runs this plant. USDA gave it {many ? "these numbers" : "this number"}, printed in
        the round inspection stamp on every package made here. The same number on your package means {plant.owner} made it
        here.
      </p>
    </div>
  );
}

/** "Made at Hillshire Brands’ plant. Look for one of these numbers…" */
export function MadeAt({ plants }: { plants: PlantInfo[] }) {
  if (plants.length === 0) return null;
  const owners = [...new Set(plants.map((p) => p.owner))].join(" and ");
  const numbers = plants.flatMap((p) => p.establishments);
  return (
    <div className="flex items-center gap-3 text-sm">
      <MiniStamp establishment={numbers[numbers.length - 1]} />
      <div className="space-y-1">
        <p>
          Made at {possessive(owners)} plant{plants.length > 1 ? "s" : ""}. Look for {numbers.length > 1 ? "one of these numbers" : "this number"} in the
          round USDA stamp:
        </p>
        <PlantNumbers establishments={numbers} />
      </div>
    </div>
  );
}

/** One recall in brief: what was found, how serious, which packages, what to do, the record. */
export function RecallBrief({ recall, className }: { recall: ChainRecall; className?: string }) {
  return (
    <div className={cn("space-y-1.5 text-sm", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <HazardChip recall={recall} />
        <span className="font-bold">{recall.hazard}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <SeverityChip recall={recall} />
        <Chip {...statusChip(recall.status)}>{recall.status}</Chip>
      </div>
      <p className="text-ink-2">
        {recall.summary}.{recall.window && ` ${recall.window}.`}
        {recall.note && ` ${recall.note}.`}
      </p>
      <p className="font-semibold">{recall.action}</p>
      <RecordLine agency={recall.agency === "FSIS" ? "USDA FSIS" : "FDA"} reference={recall.reference} date={formatIso(recall.date)} url={recall.url} />
    </div>
  );
}
