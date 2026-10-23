import { Chip } from "@/components/ui/chip";
import { ContaminantBadge } from "@/components/ContaminantBadge";
import {
  agencyChip,
  agencyLabel,
  classificationChip,
  outbreakStatusChip,
  statusChip,
} from "@/lib/classification";

interface KeyRow {
  badge: React.ReactNode;
  term: string;
  meaning: string;
}

const RECALL_CLASSES: KeyRow[] = [
  {
    badge: <Chip {...classificationChip("Class I")} size="sm">Class I</Chip>,
    term: "Most serious",
    meaning:
      "Reasonable probability that eating the product will cause serious health harm or death. Act on these immediately.",
  },
  {
    badge: <Chip {...classificationChip("Class II")} size="sm">Class II</Chip>,
    term: "Moderate",
    meaning:
      "May cause temporary or medically reversible health effects; the chance of serious harm is remote.",
  },
  {
    badge: <Chip {...classificationChip("Class III")} size="sm">Class III</Chip>,
    term: "Least serious",
    meaning:
      "Unlikely to cause harm — usually a labeling or quality issue (e.g. an undeclared minor ingredient).",
  },
  {
    badge: <Chip {...classificationChip("Not Yet Classified")} size="sm">Not Yet Classified</Chip>,
    term: "Not yet classified",
    meaning:
      "FDA has not assigned a class to this recall yet.",
  },
  {
    badge: <Chip {...classificationChip("Public Health Alert")} size="sm">Public Health Alert</Chip>,
    term: "USDA FSIS alert",
    meaning:
      "Issued by USDA FSIS when there is a food-safety concern but no formal recall — often because the product is no longer available for purchase. Treat as a warning to check what you have.",
  },
];

const RECALL_AGENCY: KeyRow[] = [
  {
    badge: <Chip {...agencyChip("FDA")} size="sm">{agencyLabel("FDA")}</Chip>,
    term: "FDA (openFDA)",
    meaning:
      "FDA-regulated foods — produce, packaged goods, seafood, and more — from the openFDA food-enforcement database.",
  },
  {
    badge: <Chip {...agencyChip("FSIS")} size="sm">{agencyLabel("FSIS")}</Chip>,
    term: "USDA FSIS",
    meaning:
      "Meat, poultry, and processed-egg products, which the FDA feed does not cover. Pulled from USDA FSIS recalls and public health alerts.",
  },
];

const RECALL_HAZARD: KeyRow[] = [
  {
    badge: <ContaminantBadge classification={{ type: "biological", label: "Biological" }} />,
    term: "Hazard type",
    meaning:
      "Biological, chemical, physical or allergenic. This is inferred from the recall's reason text by this site; it is not an official agency field. A reason that names no hazard shows as Unclassified.",
  },
];

const RECALL_STATUS: KeyRow[] = [
  { badge: <Chip {...statusChip("Ongoing")} size="sm">Ongoing</Chip>, term: "Ongoing", meaning: "Recall is still in progress; product may still be on shelves." },
  { badge: <Chip {...statusChip("Completed")} size="sm">Completed</Chip>, term: "Completed", meaning: "The recalling firm has finished its recall actions (FDA and FSIS)." },
  { badge: <Chip {...statusChip("Terminated")} size="sm">Terminated</Chip>, term: "Terminated", meaning: "FDA has determined the recall is complete and closed it out." },
];

const OUTBREAK_STATUS: KeyRow[] = [
  { badge: <Chip {...outbreakStatusChip(true)} size="sm">Active</Chip>, term: "Active", meaning: "FDA/CDC are still investigating; new illnesses may still be reported." },
  { badge: <Chip {...outbreakStatusChip(false)} size="sm">Resolved</Chip>, term: "Resolved", meaning: "Investigation closed — the outbreak appears to be over." },
];

function Section({ title, rows }: { title: string; rows: KeyRow[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.term} className="grid grid-cols-[8.5rem_1fr] items-start gap-3">
            <div className="pt-0.5">{r.badge}</div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{r.term}.</span> {r.meaning}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClassificationKey() {
  return (
    <div className="space-y-5">
      <Section title="Data source (agency)" rows={RECALL_AGENCY} />
      <Section title="Recall classification (severity)" rows={RECALL_CLASSES} />
      <Section title="Hazard type (inferred)" rows={RECALL_HAZARD} />
      <Section title="Recall status" rows={RECALL_STATUS} />
      <Section title="Outbreak status" rows={OUTBREAK_STATUS} />
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Classes and statuses follow each agency's own definitions (FDA and USDA FSIS). "Named in the
        official record" means a company FDA or CDC explicitly listed — it is not a judgment that a
        location is currently unsafe. On an outbreak page, "USDA FSIS — possibly related" recalls are
        matched by pathogen and timeframe only, not a confirmed shared investigation.
      </p>
    </div>
  );
}
