import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Info, ChevronRight, Users, RotateCcw, RadioTower } from "lucide-react";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadOutbreaks, relativeTime, type LiveOutbreaks } from "@/data/outbreaksLive";
import type { GeoZip, Outbreak, Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { formatFdaDate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RecallTrendChart } from "@/components/RecallTrendChart";
import { OutbreakModal } from "@/components/OutbreakModal";
import { ClassificationKey } from "@/components/ClassificationKey";
import { EmptyState } from "@/components/common";

function classificationTone(c: string): "critical" | "serious" | "warning" {
  if (c === "Class I") return "critical";
  if (c === "Class III") return "warning";
  return "serious"; // Class II
}

function formatIso(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CLASS_OPTIONS = [
  { value: "all", label: "Any severity" },
  { value: "Class I", label: "Class I — most serious" },
  { value: "Class II", label: "Class II — moderate" },
  { value: "Class III", label: "Class III — least serious" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "Any status" },
  { value: "Ongoing", label: "Ongoing" },
  { value: "Completed", label: "Completed" },
  { value: "Terminated", label: "Terminated" },
];

export function RecallsSection({ geo }: { geo: GeoZip | null }) {
  const [selected, setSelected] = useState<Outbreak | null>(null);
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("mystate");

  const outbreaks = useAsync<LiveOutbreaks>((signal) => loadOutbreaks(signal), []);
  const recalls = useAsync<Recall[]>((signal) => fetchRelevantRecalls(250, signal), []);

  const activeOutbreaks = useMemo(() => {
    const list = outbreaks.data?.outbreaks ?? [];
    return list
      .filter((o) => o.status === "active")
      .sort((a, b) => {
        if (a.detailed !== b.detailed) return a.detailed ? -1 : 1; // curated detail first
        return (b.caseCount ?? 0) - (a.caseCount ?? 0);
      });
  }, [outbreaks.data]);

  const scopeOptions = [
    { value: "all", label: "Anywhere" },
    { value: "nationwide", label: "Nationwide only" },
    ...(geo ? [{ value: "mystate", label: `Reaches ${geo.stateAbbr}` }] : []),
  ];

  const filtered = useMemo(() => {
    let list = recalls.data ?? [];
    if (classFilter !== "all") list = list.filter((r) => r.classification === classFilter);
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (scopeFilter === "nationwide") list = list.filter((r) => r.nationwide);
    else if (scopeFilter === "mystate" && geo)
      list = list.filter((r) => r.nationwide || r.distributionStates.includes(geo.stateAbbr));
    return list;
  }, [recalls.data, classFilter, statusFilter, scopeFilter, geo]);

  const total = (recalls.data ?? []).length;
  const filtersActive =
    classFilter !== "all" || statusFilter !== "all" || scopeFilter !== "mystate";
  const resetFilters = () => {
    setClassFilter("all");
    setStatusFilter("all");
    setScopeFilter("mystate");
  };

  return (
    <div className="space-y-8">
      {/* Active outbreaks — live from FDA CORE, progressive disclosure via modal */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-[var(--status-critical)]" />
            <h3 className="text-lg font-semibold">
              Active outbreaks
              {activeOutbreaks.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {activeOutbreaks.length} tracked
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <FreshnessBadge live={outbreaks.data} loading={outbreaks.loading} />
            <KeyButton />
          </div>
        </div>

        {outbreaks.loading ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading FDA outbreak table…
          </div>
        ) : activeOutbreaks.length === 0 ? (
          <EmptyState>No active outbreaks are being tracked right now.</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeOutbreaks.map((ob) => (
              <OutbreakTile key={ob.id} outbreak={ob} onOpen={() => setSelected(ob)} />
            ))}
          </div>
        )}
      </section>

      <OutbreakModal
        outbreak={selected}
        open={selected !== null}
        onOpenChange={(v) => !v && setSelected(null)}
      />

      {/* Live recall feed */}
      <section>
        <div className="mb-1">
          <h3 className="text-lg font-semibold">Live recall feed</h3>
          <p className="text-sm text-muted-foreground">
            Produce and pathogen recalls from the openFDA food enforcement database, updated weekly
            by the FDA.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            label="Filter by severity class"
            value={classFilter}
            onChange={setClassFilter}
            options={CLASS_OPTIONS}
            className="w-full min-w-[10rem] sm:w-auto"
          />
          <Select
            label="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            className="w-full min-w-[8rem] sm:w-auto"
          />
          <Select
            label="Filter by distribution"
            value={scopeFilter === "mystate" && !geo ? "all" : scopeFilter}
            onChange={setScopeFilter}
            options={scopeOptions}
            className="w-full min-w-[9rem] sm:w-auto"
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-4" /> Reset
            </Button>
          )}
        </div>

        {recalls.loading && (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading recalls from openFDA…
          </div>
        )}
        {recalls.error && (
          <EmptyState>
            Couldn't reach the openFDA API ({recalls.error}).{" "}
            <button className="text-primary hover:underline" onClick={recalls.reload}>
              Retry
            </button>
          </EmptyState>
        )}

        {!recalls.loading && !recalls.error && (
          <>
            <Card className="my-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recalls per month</CardTitle>
                <CardDescription>
                  Showing {filtered.length} of {total} matching records
                  {filtersActive ? " (filtered)" : ""}, last 18 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecallTrendChart recalls={filtered} />
              </CardContent>
            </Card>

            {filtered.length === 0 ? (
              <EmptyState>
                No recalls match these filters.{" "}
                {filtersActive && (
                  <button className="text-primary hover:underline" onClick={resetFilters}>
                    Reset filters
                  </button>
                )}
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {filtered.slice(0, 40).map((r) => (
                  <RecallRow key={r.id} recall={r} />
                ))}
                {filtered.length > 40 && (
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    Showing first 40 of {filtered.length}. Narrow the filters to see more specific
                    results.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function FreshnessBadge({ live, loading }: { live: LiveOutbreaks | null; loading: boolean }) {
  if (loading || !live) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={live.stale ? "Live FDA feed unavailable — showing curated outbreaks" : "From the scheduled FDA CORE scrape"}
    >
      <RadioTower className={`size-3.5 ${live.stale ? "text-muted-foreground" : "text-[var(--status-good)]"}`} />
      {live.stale ? "Curated" : `Updated ${relativeTime(live.generatedAt)}`}
    </span>
  );
}

/** Compact summary tile — basic details only; opens the detail modal on click. */
function OutbreakTile({ outbreak: ob, onOpen }: { outbreak: Outbreak; onOpen: () => void }) {
  const cases = ob.caseCount != null ? ob.caseCount.toLocaleString() : ob.caseCountText ?? "See advisory";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-lg border border-[var(--status-critical)]/30 bg-card p-4 text-left transition-colors hover:border-[var(--status-critical)]/60 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View details: ${ob.pathogen} outbreak`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="critical">Active</Badge>
          {ob.detailed && <Badge variant="secondary">Detailed</Badge>}
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-2 font-semibold leading-tight">{ob.pathogen}</div>
      <div className="text-sm text-muted-foreground">{ob.vehicle}</div>
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="size-4" />
          <span className="font-medium tabular-nums text-foreground">{cases}</span> cases
        </span>
        {ob.detailed && ob.statesAffectedCount != null && (
          <span className="tabular-nums">{ob.statesAffectedCount} states</span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {ob.detailed
          ? `Onset ${formatIso(ob.firstIllnessDate)}–${formatIso(ob.lastIllnessDate)}`
          : `FDA #${ob.refId} · posted ${formatIso(ob.datePosted)}`}
      </div>
      <div className="mt-3 text-xs font-medium text-primary">Tap for details &amp; sharing →</div>
    </button>
  );
}

function KeyButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="size-4" /> Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How to read the classifications</DialogTitle>
          <DialogDescription>
            What the severity classes, statuses, and "named in the record" labels mean.
          </DialogDescription>
        </DialogHeader>
        <ClassificationKey />
      </DialogContent>
    </Dialog>
  );
}

function RecallRow({ recall }: { recall: Recall }) {
  const tone = classificationTone(recall.classification);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={tone}>{recall.classification}</Badge>
          <Badge variant="outline">{recall.status}</Badge>
          {recall.nationwide && <Badge variant="secondary">Nationwide</Badge>}
          {!recall.nationwide &&
            recall.distributionStates.slice(0, 6).map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatFdaDate(recall.reportDate ?? recall.recallInitiationDate)}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium">{recall.productDescription}</p>
        <p className="mt-1 text-sm text-muted-foreground">{recall.reason}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Recalling firm: {recall.recallingFirm} · #{recall.recallNumber}
        </p>
      </CardContent>
    </Card>
  );
}
