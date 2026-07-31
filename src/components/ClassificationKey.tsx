import { Badge } from "@/components/ui/badge";

interface KeyRow {
  badge: React.ReactNode;
  term: string;
  meaning: string;
}

const RECALL_CLASSES: KeyRow[] = [
  {
    badge: <Badge variant="critical">Class I</Badge>,
    term: "Most serious",
    meaning:
      "Reasonable probability that eating the product will cause serious health harm or death. Act on these immediately.",
  },
  {
    badge: <Badge variant="serious">Class II</Badge>,
    term: "Moderate",
    meaning:
      "May cause temporary or medically reversible health effects; the chance of serious harm is remote.",
  },
  {
    badge: <Badge variant="warning">Class III</Badge>,
    term: "Least serious",
    meaning:
      "Unlikely to cause harm — usually a labeling or quality issue (e.g. an undeclared minor ingredient).",
  },
  {
    badge: <Badge variant="serious">Public Health Alert</Badge>,
    term: "USDA FSIS alert",
    meaning:
      "Issued by USDA FSIS when there is a food-safety concern but no formal recall — often because the product is no longer available for purchase. Treat as a warning to check what you have.",
  },
];

const RECALL_AGENCY: KeyRow[] = [
  {
    badge: <Badge variant="secondary">FDA</Badge>,
    term: "FDA (openFDA)",
    meaning:
      "FDA-regulated foods — produce, packaged goods, seafood, and more — from the openFDA food-enforcement database.",
  },
  {
    badge: <Badge variant="secondary">USDA FSIS</Badge>,
    term: "USDA FSIS",
    meaning:
      "Meat, poultry, and processed-egg products, which the FDA feed does not cover. Pulled from USDA FSIS recalls and public health alerts.",
  },
];

const RECALL_STATUS: KeyRow[] = [
  { badge: <Badge variant="outline">Ongoing</Badge>, term: "Ongoing", meaning: "Recall is still in progress; product may still be on shelves." },
  { badge: <Badge variant="outline">Completed</Badge>, term: "Completed", meaning: "The recalling firm has finished its recall actions (FDA and FSIS)." },
  { badge: <Badge variant="outline">Terminated</Badge>, term: "Terminated", meaning: "FDA has determined the recall is complete and closed it out." },
];

const OUTBREAK_STATUS: KeyRow[] = [
  { badge: <Badge variant="critical">Active</Badge>, term: "Active", meaning: "FDA/CDC are still investigating; new illnesses may still be reported." },
  { badge: <Badge variant="good">Resolved</Badge>, term: "Resolved", meaning: "Investigation closed — the outbreak appears to be over." },
];

function Section({ title, rows }: { title: string; rows: KeyRow[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.term} className="grid grid-cols-[6.5rem_1fr] items-start gap-3">
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
