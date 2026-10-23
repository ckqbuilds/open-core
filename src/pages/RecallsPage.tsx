import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Loader2, RotateCcw, Package, ShieldAlert, Beef, Globe2, ChevronDown, MapPin } from "lucide-react";
import { Card } from "@heroui/react";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadFsisRecalls, type FsisFeed } from "@/data/fsis";
import { classifyRecall } from "@/data/contaminants";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useZipContext } from "@/hooks/ZipContext";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RecallTrendChart } from "@/components/RecallTrendChart";
import { RecallRow } from "@/components/RecallRow";
import { ProductCheck } from "@/components/ProductCheck";
import { KeyButton } from "@/components/KeyButton";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { FreshnessBadge } from "@/components/FreshnessBadge";
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
const TYPE_OPTIONS = [
  { value: "all", label: "Any hazard type" },
  { value: "biological", label: "Biological" },
  { value: "chemical", label: "Chemical" },
  { value: "physical", label: "Physical" },
  { value: "allergenic", label: "Allergenic" },
  { value: "other", label: "Unclassified" },
];

/** Default view: Ongoing recalls reported within this many days. */
const CURRENT_DAYS = 90;

/** Standalone live recall feed: chart + severity/status/distribution filters + rows. */
export function RecallsPage() {
  const [archive, setArchive] = useState(false);
  useDocumentTitle(archive ? "Recall archive · OpenCORE" : "Active recalls · OpenCORE");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { geo } = useZipContext();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#check") document.getElementById("check")?.scrollIntoView();
  }, [hash]);
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("mystate");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const recalls = useAsync<Recall[]>((signal) => fetchRelevantRecalls(250, signal), []);
  const fsis = useAsync<FsisFeed>((signal) => loadFsisRecalls(signal), []);
  const [trendOpen, setTrendOpen] = useState(false);

  // The two regulatory feeds, newest first. FSIS covers meat/poultry openFDA can't.
  const combined = useMemo(() => {
    const key = (r: Recall) => r.reportDate ?? r.recallInitiationDate ?? "";
    return [...(recalls.data ?? []), ...(fsis.data?.recalls ?? [])].sort((a, b) =>
      key(b).localeCompare(key(a))
    );
  }, [recalls.data, fsis.data]);

  // Default scope is Ongoing + last 90 days; Archive or an explicit status lifts it.
  const defaultScope = !archive && statusFilter === "all";
  const scoped = useMemo(() => {
    if (!defaultScope) return combined;
    const d = new Date();
    d.setDate(d.getDate() - CURRENT_DAYS);
    const cutoff = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return combined.filter(
      (r) => r.status === "Ongoing" && (r.reportDate ?? r.recallInitiationDate ?? "") >= cutoff
    );
  }, [combined, defaultScope]);

  const stats = useMemo(
    () => ({
      total: scoped.length,
      classI: scoped.filter((r) => r.classification === "Class I").length,
      fsis: scoped.filter((r) => r.agency === "FSIS").length,
      nationwide: scoped.filter((r) => r.nationwide).length,
      reach: geo
        ? scoped.filter((r) => r.nationwide || r.distributionStates.includes(geo.stateAbbr)).length
        : 0,
    }),
    [scoped, geo]
  );

  const scopeOptions = [
    { value: "all", label: "Anywhere" },
    { value: "nationwide", label: "Nationwide only" },
    ...(geo ? [{ value: "mystate", label: `Reaches ${geo.stateAbbr}` }] : []),
  ];

  const filtered = useMemo(() => {
    let list = scoped;
    if (agencyFilter !== "all") list = list.filter((r) => (r.agency ?? "FDA") === agencyFilter);
    if (classFilter !== "all") list = list.filter((r) => r.classification === classFilter);
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (scopeFilter === "nationwide") list = list.filter((r) => r.nationwide);
    else if (scopeFilter === "mystate" && geo)
      list = list.filter((r) => r.nationwide || r.distributionStates.includes(geo.stateAbbr));
    if (typeFilter !== "all") list = list.filter((r) => classifyRecall(r).type === typeFilter);
    return list;
  }, [scoped, agencyFilter, classFilter, statusFilter, scopeFilter, typeFilter, geo]);

  const total = scoped.length;
  const autoScoped = scopeFilter === "mystate" && !!geo;
  const filtersActive =
    classFilter !== "all" ||
    statusFilter !== "all" ||
    scopeFilter !== "mystate" ||
    agencyFilter !== "all" ||
    typeFilter !== "all" ||
    archive;
  const onlyArchive =
    archive &&
    classFilter === "all" &&
    statusFilter === "all" &&
    scopeFilter === "mystate" &&
    agencyFilter === "all" &&
    typeFilter === "all";
  const activeCount = [
    classFilter !== "all",
    statusFilter !== "all",
    scopeFilter !== "mystate",
    agencyFilter !== "all",
    typeFilter !== "all",
  ].filter(Boolean).length;
  const resetFilters = () => {
    setArchive(false);
    setClassFilter("all");
    setStatusFilter("all");
    setScopeFilter("mystate");
    setAgencyFilter("all");
    setTypeFilter("all");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Package className="size-6 text-primary" />}
        title={archive ? "Recall archive" : "Active recalls"}
        description={
          archive
            ? "Every recall on record from the last 3 years, including completed and terminated ones, from two regulatory feeds: the openFDA food enforcement database (FDA) and USDA FSIS for meat, poultry, and egg."
            : "Ongoing recalls reported in the last 90 days, from two regulatory feeds: the openFDA food enforcement database (FDA) and USDA FSIS for meat, poultry, and egg. Completed, terminated, and older recalls are in the archive."
        }
        actions={
          <div className="flex flex-col items-end gap-2">
            <KeyButton />
            <FreshnessBadge kind="fsis" live={fsis.data} loading={fsis.loading} failed={!!fsis.error} />
          </div>
        }
      />

      <ProductCheck recalls={combined} />

      {!recalls.loading && !recalls.error && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Recalls tracked" value={stats.total} icon={<Package className="size-4" />} />
          {geo ? (
            <StatCard
              label={`Reach ${geo.stateAbbr}`}
              value={stats.reach}
              icon={<MapPin className="size-4" />}
              hint="nationwide or listing your state"
              tone={stats.reach > 0 ? "critical" : "default"}
            />
          ) : (
            <StatCard label="Nationwide" value={stats.nationwide} icon={<Globe2 className="size-4" />} />
          )}
          <StatCard
            label="USDA FSIS"
            value={stats.fsis}
            icon={<Beef className="size-4" />}
            hint="meat & poultry"
            tone="accent"
          />
          {geo ? (
            <StatCard label="Nationwide" value={stats.nationwide} icon={<Globe2 className="size-4" />} />
          ) : (
            <StatCard
              label="Class I — most serious"
              value={stats.classI}
              icon={<ShieldAlert className="size-4" />}
              tone="critical"
            />
          )}
        </div>
      )}

      <Card className="gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="hidden text-sm font-semibold md:block">Filter recalls</h2>
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="recall-filters"
            onClick={() => setFiltersOpen((o) => !o)}
            className="inline-flex h-10 items-center gap-1.5 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            Filters{activeCount > 0 ? ` · ${activeCount} active` : ""}
            <ChevronDown className={cn("size-4 transition-transform", filtersOpen && "rotate-180")} />
          </button>
          <div className="flex items-center gap-2">
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="size-4" /> Reset
              </Button>
            )}
            <div
              role="group"
              aria-label="Recall scope"
              className="inline-flex h-10 items-center rounded-md border border-input p-0.5"
            >
              {[
                { v: false, label: "Current" },
                { v: true, label: "Archive" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={archive === o.v}
                  onClick={() => setArchive(o.v)}
                  className={cn(
                    "h-8 rounded px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    archive === o.v
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div
          id="recall-filters"
          className={cn(
            "gap-4 sm:grid-cols-2 md:grid lg:grid-cols-[2fr_2fr_1fr]",
            filtersOpen ? "grid" : "hidden"
          )}
        >
          <fieldset className="min-w-0 space-y-1.5">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">What</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select label="Filter by agency" value={agencyFilter} onChange={setAgencyFilter} options={AGENCY_OPTIONS} />
              <Select label="Filter by contaminant type" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
            </div>
          </fieldset>
          <fieldset className="min-w-0 space-y-1.5">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">How serious</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select label="Filter by severity class" value={classFilter} onChange={setClassFilter} options={CLASS_OPTIONS} />
              <Select label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
            </div>
          </fieldset>
          <fieldset className="min-w-0 space-y-1.5 sm:col-span-2 lg:col-span-1">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Where</legend>
            <Select
              label="Filter by distribution"
              value={scopeFilter === "mystate" && !geo ? "all" : scopeFilter}
              onChange={setScopeFilter}
              options={scopeOptions}
            />
          </fieldset>
        </div>
      </Card>

      {recalls.loading && (
        <div role="status" className="flex h-40 items-center justify-center text-sm text-muted-foreground">
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
          {autoScoped && geo && (
            <p className="text-sm text-muted-foreground">
              Showing recalls that reach {geo.stateAbbr} ·{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setScopeFilter("all")}
              >
                Show all
              </button>
            </p>
          )}
          <div className="space-y-2">
            <h2 aria-live="polite" className="text-base font-semibold">
              Showing {filtered.length} of {total}{" "}
              {defaultScope ? "ongoing recalls from the last 90 days" : "records in the archive"}
              {filtersActive && !onlyArchive ? " (filtered)" : ""}
            </h2>
            <div>
              <button
                type="button"
                aria-expanded={trendOpen}
                aria-controls="recall-trend"
                onClick={() => setTrendOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {defaultScope ? "Trend by month, current scope" : "Trend by month, archive"}
                <ChevronDown className={cn("size-4 transition-transform", trendOpen && "rotate-180")} />
              </button>
              {trendOpen && (
                <div id="recall-trend" className="pt-2">
                  <RecallTrendChart recalls={filtered} />
                </div>
              )}
            </div>
          </div>

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
