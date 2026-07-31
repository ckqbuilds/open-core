import { useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { fetchRelevantRecalls } from "@/data/openfda";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useZipContext } from "@/hooks/ZipContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RecallTrendChart } from "@/components/RecallTrendChart";
import { RecallRow } from "@/components/RecallRow";
import { KeyButton } from "@/components/KeyButton";
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

/** Standalone live recall feed: chart + severity/status/distribution filters + rows. */
export function RecallsPage() {
  const { geo } = useZipContext();
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("mystate");

  const recalls = useAsync<Recall[]>((signal) => fetchRelevantRecalls(250, signal), []);

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
  const filtersActive = classFilter !== "all" || statusFilter !== "all" || scopeFilter !== "mystate";
  const resetFilters = () => {
    setClassFilter("all");
    setStatusFilter("all");
    setScopeFilter("mystate");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Active recalls</h1>
          <p className="text-sm text-muted-foreground">
            Produce and pathogen recalls from the openFDA food enforcement database, updated weekly
            by the FDA. Filter by severity, status, and distribution.
          </p>
        </div>
        <KeyButton />
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
