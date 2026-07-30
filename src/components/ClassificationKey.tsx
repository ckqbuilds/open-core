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
];

const RECALL_STATUS: KeyRow[] = [
  { badge: <Badge variant="outline">Ongoing</Badge>, term: "Ongoing", meaning: "Recall is still in progress; product may still be on shelves." },
  { badge: <Badge variant="outline">Completed</Badge>, term: "Completed", meaning: "Recalling firm has finished its recall actions." },
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
      <Section title="Recall classification (severity)" rows={RECALL_CLASSES} />
      <Section title="Recall status" rows={RECALL_STATUS} />
      <Section title="Outbreak status" rows={OUTBREAK_STATUS} />
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Classes and statuses follow the FDA's own definitions. "Named in the official record" means a
        company FDA or CDC explicitly listed — it is not a judgment that a location is currently
        unsafe.
      </p>
    </div>
  );
}
