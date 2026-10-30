import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StepKind = "source" | "downstream" | "open";

interface Lane {
  name: string;
  sub: string;
  steps: { kind: StepKind; when: string; what: string; detail: string }[];
}

/** Hand-verified from each notice: how an upstream problem reached other makers and brands. */
const LANES: Lane[] = [
  {
    name: "Boar's Head deli meats",
    sub: "One plant, two brands; the recall widened in 4 days",
    steps: [
      { kind: "source", when: "Jul 26, 2024", what: "Boar's Head recalls liverwurst and other deli meats", detail: "FSIS 023-2024 · Listeria" },
      { kind: "downstream", when: "Jul 30, 2024", what: "Expanded by about 7 million lb and 71 products", detail: "Adds the Old Country brand · EST. 12612" },
      { kind: "downstream", when: "Through Oct 17, 2024", what: "Sell-by dates covered", detail: "Products made May 10 – Jul 29, 2024" },
    ],
  },
  {
    name: "Jalapeños",
    sub: "A produce recall that reached meat plants",
    steps: [
      { kind: "source", when: "Before Aug 8, 2026", what: "FDA recall of a jalapeño ingredient", detail: "Salmonella · Taylor Farms listed as contact" },
      { kind: "downstream", when: "Aug 8, 2026", what: "FSIS alert for meat and poultry made with it", detail: "Greencore USA and Bakkavor USA listed · PHA-08082026-01" },
      { kind: "open", when: "Open", what: "More downstream products expected", detail: "FSIS said it would add products as they were found" },
    ],
  },
  {
    name: "Iceberg lettuce",
    sub: "An outbreak with a named supplier and a named restaurant",
    steps: [
      { kind: "source", when: "Jul 18, 2026", what: "FDA names Taylor Farms de México as the lettuce supplier", detail: "Cyclospora · 5 states" },
      { kind: "downstream", when: "Jul 18, 2026", what: "Walmart Marketside salads in the recall", detail: "Best if used by Jul 18 – Aug 3, 2026" },
      { kind: "open", when: "Jul 21, 2026", what: "CDC names Taco Bell as where many sick people ate", detail: "The notices don't name Taco Bell's lettuce supplier, so no link is drawn" },
    ],
  },
];

/** One lane per incident: the upstream recall first, then each downstream step as agencies added it. */
export function RecallRipple() {
  return (
    <div>
      {LANES.map((lane) => (
        <div key={lane.name} className="row-rule grid gap-x-6 gap-y-3 px-1 py-5 md:grid-cols-[12rem_minmax(0,1fr)]">
          <div>
            <h3 className="text-lg font-extrabold leading-tight">{lane.name}</h3>
            <p className="mt-1 text-sm text-ink-2">{lane.sub}</p>
          </div>
          <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            {lane.steps.map((s, i) => (
              <li key={s.what} className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
                {i > 0 && <ArrowRight aria-hidden className="hidden size-4 shrink-0 text-ink-2 lg:block" />}
                <div
                  className={cn(
                    "grid h-full w-full gap-0.5 rounded-lg border-[1.5px] px-3 py-2.5 text-sm",
                    s.kind === "source" && "border-ink bg-ink text-ground",
                    s.kind === "downstream" && "border-ink bg-paper",
                    s.kind === "open" && "border-dashed border-ink-2 text-ink-2"
                  )}
                >
                  <span className={cn("font-mono text-xs", s.kind === "source" ? "text-ground/75" : "text-ink-2")}>{s.when}</span>
                  <span className="font-bold leading-snug">{s.what}</span>
                  <span className={cn("text-xs", s.kind === "source" ? "text-ground/75" : "text-ink-2")}>{s.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
