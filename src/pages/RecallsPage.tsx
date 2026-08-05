import { useMemo, useState } from "react";
import { Loader2, RotateCcw, Package, ShieldAlert, Beef, Globe2 } from "lucide-react";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadFsisRecalls } from "@/data/fsis";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useZipContext } from "@/hooks/ZipContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RecallTrendChart } from "@/components/RecallTrendChart";
import { RecallRow } from "@/components/RecallRow";
import { KeyButton } from "@/components/KeyButton";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/common";

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
const AGENCY_OPTIONS = [
  { value: "all", label: "Both agencies" },
  { value: "FDA", label: "FDA (openFDA)" },
  { value: "FSIS", label: "USDA FSIS — meat & poultry" },
];

/** Standalone live recall feed: chart + severity/status/distribution filters + rows. */
export function RecallsPage() {
  const { geo } = useZipContext();
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("mystate");
  const [agencyFilter, setAgencyFilter] = useState("all");

  const recalls = useAsync<Recall[]>((signal) => fetchRelevantRecalls(250, signal), []);
  const fsis = useAsync<Recall[]>(
    async (signal) => (await loadFsisRecalls(signal)).recalls,
    []
  );

  // The two regulatory feeds, newest first. FSIS covers meat/poultry openFDA can't.
  const combined = useMemo(() => {
    const key = (r: Recall) => r.reportDate ?? r.recallInitiationDate ?? "";
    return [...(recalls.data ?? []), ...(fsis.data ?? [])].sort((a, b) =>
      key(b).localeCompare(key(a))
    );
  }, [recalls.data, fsis.data]);

  const stats = useMemo(
    () => ({
      total: combined.length,
      classI: combined.filter((r) => r.classification === "Class I").length,
      fsis: combined.filter((r) => r.agency === "FSIS").length,
      nationwide: combined.filter((r) => r.nationwide).length,
    }),
    [combined]
  );

  const scopeOptions = [
    { value: "all", label: "Anywhere" },
    { value: "nationwide", label: "Nationwide only" },
    ...(geo ? [{ value: "mystate", label: `Reaches ${geo.stateAbbr}` }] : []),
  ];

  const filtered = useMemo(() => {
    let list = combined;
    if (agencyFilter !== "all") list = list.filter((r) => (r.agency ?? "FDA") === agencyFilter);
    if (classFilter !== "all") list = list.filter((r) => r.classification === classFilter);
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (scopeFilter === "nationwide") list = list.filter((r) => r.nationwide);
    else if (scopeFilter === "mystate" && geo)
      list = list.filter((r) => r.nationwide || r.distributionStates.includes(geo.stateAbbr));
    return list;
  }, [combined, agencyFilter, classFilter, statusFilter, scopeFilter, geo]);

  const total = combined.length;
  const filtersActive =
    classFilter !== "all" ||
    statusFilter !== "all" ||
    scopeFilter !== "mystate" ||
    agencyFilter !== "all";
  const resetFilters = () => {
    setClassFilter("all");
    setStatusFilter("all");
    setScopeFilter("mystate");
    setAgencyFilter("all");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Package className="size-6 text-primary" />}
        title="Active recalls"
        description="Two regulatory feeds together: produce and pathogen recalls from the openFDA food enforcement database (FDA), plus meat, poultry, and egg recalls from USDA FSIS."
        actions={<KeyButton />}
      />

      {!recalls.loading && !recalls.error && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Recalls tracked" value={stats.total} icon={<Package className="size-4" />} />
          <StatCard
            label="Class I — most serious"
            value={stats.classI}
            icon={<ShieldAlert className="size-4" />}
            tone="critical"
          />
          <StatCard
            label="USDA FSIS"
            value={stats.fsis}
            icon={<Beef className="size-4" />}
            hint="meat & poultry"
            tone="accent"
          />
          <StatCard
            label="Nationwide"
            value={stats.nationwide}
            icon={<Globe2 className="size-4" />}
          />
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 p-4">
          <Select
            label="Filter by agency"
            value={agencyFilter}
            onChange={setAgencyFilter}
            options={AGENCY_OPTIONS}
            className="w-full min-w-[11rem] sm:w-auto"
          />
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
        </CardContent>
      </Card>

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
          <Card>
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
    </div>
  );
}
