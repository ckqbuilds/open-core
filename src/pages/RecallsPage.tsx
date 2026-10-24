import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Loader2, RotateCcw, Package, ChevronDown, ScanBarcode, Search } from "lucide-react";
import { Card } from "@heroui/react";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadFsisRecalls, type FsisFeed } from "@/data/fsis";
import { classifyRecall } from "@/data/contaminants";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useZipContext } from "@/hooks/ZipContext";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Disclosure } from "@/components/Disclosure";
import { RecallTrendChart } from "@/components/RecallTrendChart";
import { RecallRow } from "@/components/RecallRow";
import { ProductCheck } from "@/components/ProductCheck";
import { KeyButton } from "@/components/KeyButton";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { FreshnessBadge } from "@/components/FreshnessBadge";
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
  const [params, setParams] = useSearchParams();
  const param = (key: string, fallback: string) => params.get(key) || fallback;
  const setParam = (key: string, value: string, fallback: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === fallback || value === "") next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );
  const archive = params.get("archive") === "1";
  const setArchive = (v: boolean) => setParam("archive", v ? "1" : "", "");
  const query = param("q", "");
  const setQuery = (v: string) => setParam("q", v, "");
  const classFilter = param("class", "all");
  const setClassFilter = (v: string) => setParam("class", v, "all");
  const statusFilter = param("status", "all");
  const setStatusFilter = (v: string) => setParam("status", v, "all");
  const scopeFilter = param("scope", "mystate");
  const setScopeFilter = (v: string) => setParam("scope", v, "mystate");
  const agencyFilter = param("agency", "all");
  const setAgencyFilter = (v: string) => setParam("agency", v, "all");
  const typeFilter = param("type", "all");
  const setTypeFilter = (v: string) => setParam("type", v, "all");

  useDocumentTitle(archive ? "Recall archive · OpenCORE" : "Active recalls · OpenCORE");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { geo } = useZipContext();
  const { hash, key: locationKey } = useLocation();
  const [checkOpen, setCheckOpen] = useState(hash === "#check");
  useEffect(() => {
    if (hash !== "#check") return;
    setCheckOpen(true);
    const t = setTimeout(() => {
      document.getElementById("check")?.scrollIntoView();
      document.getElementById("barcode")?.focus({ preventScroll: true });
    }, 120);
    return () => clearTimeout(t);
  }, [hash, locationKey]);

  const recalls = useAsync<Recall[]>((signal) => fetchRelevantRecalls(250, signal), []);
  const fsis = useAsync<FsisFeed>((signal) => loadFsisRecalls(signal), []);
  const [trendOpen, setTrendOpen] = useState(false);
  const [shown, setShown] = useState(40);

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
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (r) =>
          (r.productDescription ?? "").toLowerCase().includes(q) ||
          (r.reason ?? "").toLowerCase().includes(q) ||
          (r.recallingFirm ?? "").toLowerCase().includes(q)
      );
    return list;
  }, [scoped, agencyFilter, classFilter, statusFilter, scopeFilter, typeFilter, query, geo]);

  useEffect(() => setShown(40), [filtered]);

  const summary = useMemo(() => {
    const reach = geo
      ? filtered.filter((r) => r.nationwide || r.distributionStates.includes(geo.stateAbbr)).length
      : 0;
    return {
      reach,
      fsis: filtered.filter((r) => r.agency === "FSIS").length,
      nationwide: filtered.filter((r) => r.nationwide).length,
    };
  }, [filtered, geo]);
  const fsisSince = fsis.data?.generatedAt ? new Date(fsis.data.generatedAt) : null;
  const fsisOld = !!fsisSince && !isNaN(+fsisSince) && Date.now() - +fsisSince > 14 * 86400000;
  const fsisUnavailable = !!fsis.error || (!fsis.loading && (!!fsis.data?.stale || fsisOld));
  const feedNote = fsisUnavailable
    ? fsisSince && !isNaN(+fsisSince) && !fsis.error
      ? `Meat and poultry recalls after ${fsisSince.toLocaleDateString("en-US", { month: "short", day: "numeric" })} are not included (USDA FSIS feed incomplete)`
      : "Meat and poultry recalls after the last update are not included (USDA FSIS feed unavailable)"
    : null;
  const stateListed = geo
    ? filtered.filter((r) => !r.nationwide && r.distributionStates.includes(geo.stateAbbr)).length
    : 0;
  const summaryTail = [
    geo && summary.reach > 0
      ? summary.nationwide > 0
        ? `${stateListed} listed for ${geo.stateAbbr} + ${summary.nationwide} nationwide`
        : `${summary.reach} reach ${geo.stateAbbr}`
      : null,
    fsisUnavailable ? null : summary.fsis > 0 ? `${summary.fsis} USDA FSIS` : null,
    !geo && summary.nationwide > 0 ? `${summary.nationwide} nationwide` : null,
    geo && summary.reach === 0 && summary.nationwide > 0 ? `${summary.nationwide} nationwide` : null,
  ]
    .filter(Boolean)
    .map((t) => ` · ${t}`)
    .join("");
  const autoScoped = scopeFilter === "mystate" && !!geo;
  const filtersActive =
    classFilter !== "all" ||
    statusFilter !== "all" ||
    scopeFilter !== "mystate" ||
    agencyFilter !== "all" ||
    typeFilter !== "all" ||
    query !== "" ||
    archive;
  const onlyArchive =
    archive &&
    classFilter === "all" &&
    statusFilter === "all" &&
    scopeFilter === "mystate" &&
    agencyFilter === "all" &&
    typeFilter === "all" &&
    query === "";
  // Controls behind the "More filters" disclosure (What, How serious).
  const activeCount = [classFilter !== "all", statusFilter !== "all", agencyFilter !== "all", typeFilter !== "all"].filter(
    Boolean
  ).length;
  const selectsNonDefault = activeCount > 0 || scopeFilter !== "mystate";
  const filterNote = filtersActive && !onlyArchive ? ", filtered" : "";
  const resetFilters = () => setParams(new URLSearchParams(), { replace: true });

  return (
    <div className="space-y-8">
      {archive && (
        <button
          type="button"
          onClick={() => setArchive(false)}
          className="-mb-4 inline-flex min-h-10 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Back to active recalls
        </button>
      )}
      <PageHeader
        icon={<Package className="size-6 text-primary" />}
        title={archive ? "Recall archive" : "Active recalls"}
        description={
          archive
            ? "Every recall on record from the last 3 years, including completed and terminated ones, from FDA and USDA FSIS."
            : "Ongoing FDA and USDA FSIS recalls from the last 90 days; older and closed recalls are in the archive."
        }
        actions={
          <div className="flex flex-col items-end gap-2">
            <KeyButton />
            <FreshnessBadge kind="fsis" live={fsis.data} loading={fsis.loading} failed={!!fsis.error} />
          </div>
        }
      />

      {!recalls.loading && !recalls.error && (
        <div className="-mt-4 space-y-2">
          <div className="space-y-2">
            <h2 className="sr-only">Recall records</h2>
            <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
              {filtered.length}{" "}
              {archive || !defaultScope
                ? `${filtered.length === 1 ? "recall" : "recalls"} on record (3 years${filterNote})`
                : `ongoing ${filtered.length === 1 ? "recall" : "recalls"} (last 90 days${filterNote})`}
              {summaryTail}
            </p>
          </div>
          {autoScoped && geo && (
            <p className="inline-flex flex-wrap items-center gap-x-1.5 rounded-md border border-input px-3 text-sm text-muted-foreground">
              Scoped to {geo.stateAbbr} ·
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setScopeFilter("all")}
              >
                Show all
              </button>
            </p>
          )}
        </div>
      )}

      <Disclosure
        id="check"
        open={checkOpen}
        onOpenChange={setCheckOpen}
        icon={<ScanBarcode className="size-5 text-primary" />}
        label="Check a product barcode"
        buttonClassName="text-base font-semibold"
      >
        <ProductCheck recalls={combined} feedNote={feedNote} />
      </Disclosure>

      <Card className="gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="recall-filters"
            onClick={() => setFiltersOpen((o) => !o)}
            className="inline-flex h-10 items-center gap-1.5 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            More filters{activeCount > 0 ? ` (${activeCount} active)` : ""}
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
              className="inline-flex h-11 items-center rounded-md border border-input p-0.5"
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
                    "h-10 rounded px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="recall-search" className="text-xs font-medium text-muted-foreground">
              Search recalls
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="recall-search"
                type="search"
                autoComplete="off"
                placeholder="Product, reason, or recalling firm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 text-base sm:text-sm"
              />
            </div>
          </div>
          <fieldset className="min-w-0 space-y-1.5">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Where</legend>
            <Select
              label="Filter by distribution"
              value={scopeFilter === "mystate" && !geo ? "all" : scopeFilter}
              onChange={setScopeFilter}
              options={scopeOptions}
            />
          </fieldset>
        </div>
        <div id="recall-filters" className={cn("gap-4 sm:grid-cols-2", filtersOpen ? "grid" : "hidden")}>
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
          {filtered.length === 0 ? (
            <EmptyState>
              {query.trim() !== "" ? (
                <>
                  <p>
                    No {archive ? "recall in the archive" : "ongoing recall in the last 90 days"} mentions &ldquo;{query.trim()}&rdquo;{selectsNonDefault ? " with the current filters" : ""}. That is not a sign it is unaffected.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {!archive && (
                      <Button size="sm" onClick={() => setArchive(true)}>
                        Search the archive for &lsquo;{query.trim()}&rsquo;
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p>No recalls match these filters.</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {filtersActive && (
                      <Button variant="ghost" size="sm" onClick={resetFilters}>
                        Reset filters
                      </Button>
                    )}
                    {!archive && (
                      <Button size="sm" onClick={() => setArchive(true)}>
                        Include the archive
                      </Button>
                    )}
                  </div>
                </>
              )}
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, shown).map((r) => (
                <RecallRow key={r.id} recall={r} />
              ))}
              {filtered.length > 40 && (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <p aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
                    Showing {Math.min(shown, filtered.length)} of {filtered.length}
                  </p>
                  {shown < filtered.length && (
                    <button
                      type="button"
                      onClick={() => setShown((n) => n + 40)}
                      className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Show {Math.min(40, filtered.length - shown)} more
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <div>
            <button
              type="button"
              aria-expanded={trendOpen}
              aria-controls="recall-trend"
              onClick={() => setTrendOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 min-h-10 rounded-md py-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {defaultScope ? "Trend by month, current scope" : "Trend by month, archive"}
              <ChevronDown className={cn("size-4 transition-transform", trendOpen && "rotate-180")} />
            </button>
            {trendOpen && (
              <div id="recall-trend" className="pt-2">
                <RecallTrendChart recalls={filtered} fsisAsOf={fsisUnavailable ? fsisSince : null} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
