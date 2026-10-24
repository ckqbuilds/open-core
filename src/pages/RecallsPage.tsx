import { currentCutoff, isCurrentNotice } from "@/data/recallScope";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { cn, formatFdaDate } from "@/lib/utils";
import { ArrowLeft, RotateCcw, ChevronDown, ScanBarcode, Search } from "lucide-react";
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
import { RecordLine, recordRule } from "@/components/RecordLine";
import { cleanFirmName, recallEventKey, repairEncoding } from "@/data/avoidance";
import { agencyLabel } from "@/lib/classification";
import { ProductCheck } from "@/components/ProductCheck";
import { KeyButton } from "@/components/KeyButton";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { EmptyState, Loading, Sheet } from "@/components/common";

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

/** Feed order: how serious the agency says the recall is. */
// Most serious first. "Not Yet Classified" sits next to Class I: FDA has not
// said how serious it is, which is not the same as saying it is minor.
const SEVERITY_RANK: Record<string, number> = {
  "Class I": 0,
  "Not Yet Classified": 1,
  "Public Health Alert": 2,
  "Class II": 3,
  "Class III": 4,
};


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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
    const cutoff = currentCutoff();
    return combined.filter((r) => isCurrentNotice(r, cutoff));
  }, [combined, defaultScope]);

  const scopeOptions = [
    { value: "all", label: "Anywhere" },
    { value: "nationwide", label: "Nationwide only" },
    ...(geo ? [{ value: "mystate", label: `Reaches ${geo.stateAbbr}` }] : []),
  ];

  // Every filter except the distribution scope, so "Show all N" can name its target.
  const unscoped = useMemo(() => {
    let list = scoped;
    if (agencyFilter !== "all") list = list.filter((r) => (r.agency ?? "FDA") === agencyFilter);
    if (classFilter !== "all") list = list.filter((r) => r.classification === classFilter);
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
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
  }, [scoped, agencyFilter, classFilter, statusFilter, typeFilter, query]);

  const filtered = useMemo(() => {
    if (scopeFilter === "nationwide") return unscoped.filter((r) => r.nationwide);
    if (scopeFilter === "mystate" && geo)
      return unscoped.filter((r) => r.nationwide || r.distributionStates.includes(geo.stateAbbr));
    return unscoped;
  }, [unscoped, scopeFilter, geo]);

  // One card per recall event (same key as the shelf digest); later records of
  // the same event fold into that card.
  const groups = useMemo(() => {
    const map = new Map<string, Recall[]>();
    for (const r of filtered) {
      const k = recallEventKey(r);
      const g = map.get(k);
      if (g) g.push(r);
      else map.set(k, [r]);
    }
    // Most serious first, then newest (the input is already newest-first and sort is stable).
    const rank = (g: Recall[]) => Math.min(...g.map((r) => SEVERITY_RANK[r.classification] ?? 5));
    return [...map.values()].sort((a, b) => rank(a) - rank(b));
  }, [filtered]);

  // Events from the same firm about the same product on different dates read
  // as duplicates; name the relationship instead of hiding it.
  const relatedTo = useMemo(() => {
    const sig = (r: Recall) =>
      `${cleanFirmName(r.recallingFirm).toLowerCase()}|${r.productDescription.toLowerCase().replace(/\s+/g, " ").slice(0, 40)}`;
    const bySig = new Map<string, Recall[]>();
    for (const g of groups) {
      const k = sig(g[0]);
      const list = bySig.get(k);
      if (list) list.push(g[0]);
      else bySig.set(k, [g[0]]);
    }
    const out = new Map<string, Recall[]>();
    for (const list of bySig.values()) {
      if (list.length < 2) continue;
      for (const r of list) out.set(r.id, list.filter((o) => o.id !== r.id));
    }
    return out;
  }, [groups]);

  useEffect(() => setShown(40), [filtered]);

  const nationwideCount = useMemo(() => filtered.filter((r) => r.nationwide).length, [filtered]);
  const fsisSince = fsis.data?.generatedAt ? new Date(fsis.data.generatedAt) : null;
  const fsisOld = !!fsisSince && !isNaN(+fsisSince) && Date.now() - +fsisSince > 14 * 86400000;
  const fsisUnavailable = !!fsis.error || (!fsis.loading && (!!fsis.data?.stale || fsisOld));
  const feedNote = fsisUnavailable
    ? fsisSince && !isNaN(+fsisSince) && !fsis.error
      ? `Meat and poultry recalls after ${fsisSince.toLocaleDateString("en-US", { month: "short", day: "numeric" })} are not included (USDA FSIS feed incomplete)`
      : "Meat and poultry recalls after the last update are not included (USDA FSIS feed unavailable)"
    : null;
  const autoScoped = scopeFilter === "mystate" && !!geo;
  const filtersActive =
    classFilter !== "all" ||
    statusFilter !== "all" ||
    scopeFilter !== "mystate" ||
    agencyFilter !== "all" ||
    typeFilter !== "all" ||
    query !== "" ||
    archive;
  // Controls behind the "More filters" disclosure (What, How serious).
  const activeCount = [classFilter !== "all", statusFilter !== "all", agencyFilter !== "all", typeFilter !== "all"].filter(
    Boolean
  ).length;
  const selectsNonDefault = activeCount > 0 || scopeFilter !== "mystate";
  const filterNote = activeCount > 0 || query.trim() !== "" ? ", filtered" : "";
  const resetFilters = () => setParams(new URLSearchParams(), { replace: true });

  const scopeToggle = (className: string) => (
    <div role="group" aria-label="Recall scope" className={cn("items-center gap-2", className)}>
      {[
        { v: false, label: "Current" },
        { v: true, label: "Archive" },
      ].map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={archive === o.v}
          onClick={() => setArchive(o.v)}
          className="capsule capsule--sm"
        >
          {o.label}
          <span aria-hidden className="capsule__chip" />
        </button>
      ))}
    </div>
  );
  const mobileFilterCount = activeCount + (scopeFilter !== "mystate" ? 1 : 0) + (query !== "" ? 1 : 0);

  const linkBtn = "link inline-flex min-h-9 pointer-coarse:min-h-10 items-center px-2 text-sm";
  const emptyRecovery = (
    <>
      {filtersActive && (
        <button type="button" className={linkBtn} onClick={resetFilters}>
          Reset filters
        </button>
      )}
      {autoScoped && (
        <button type="button" className={linkBtn} onClick={() => setScopeFilter("all")}>
          Show all states
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-10">
      {archive && (
        <button type="button" onClick={() => setArchive(false)} className="capsule capsule--sm capsule--ghost -mb-4">
          <ArrowLeft className="size-4" aria-hidden /> Back to active recalls
        </button>
      )}
      <PageHeader
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

      {!recalls.loading && !recalls.error && filtered.length > 0 && (
        <div className="-mt-4 space-y-2">
          <h2 className="sr-only">Recall records</h2>
          <p
            aria-live="polite"
            title="Most serious first (Class I, then not-yet-classified), then newest"
            className="text-sm text-ink-2"
          >
            {autoScoped && geo ? (
              <>
                <span className="tnum">{filtered.length}</span> recall {filtered.length === 1 ? "notice reaches" : "notices reach"} {geo.stateAbbr}
                {nationwideCount > 0 && ` (${nationwideCount} of them nationwide)`}
                {` in ${groups.length} ${groups.length === 1 ? "recall" : "recalls"}`}
                {unscoped.length > filtered.length && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="link pointer-coarse:-my-2 pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
                      onClick={() => setScopeFilter("all")}
                    >
                      Show all {unscoped.length}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="tnum">{filtered.length}</span> recall {filtered.length === 1 ? "notice" : "notices"} in{" "}
                <span className="tnum">{groups.length}</span> {groups.length === 1 ? "recall" : "recalls"}
                {archive || !defaultScope
                  ? ` on record (3 years${filterNote})`
                  : `, ongoing in the last 90 days${filterNote}`}
              </>
            )}
          </p>
        </div>
      )}

      <Disclosure
        id="check"
        open={checkOpen}
        onOpenChange={setCheckOpen}
        icon={<ScanBarcode aria-hidden />}
        label="Check a product barcode"
        buttonClassName="capsule--sun"
      >
        <ProductCheck recalls={combined} feedNote={feedNote} />
      </Disclosure>

      <div className="flex items-center justify-between gap-2 md:hidden">
        {scopeToggle("inline-flex")}
        <button
          type="button"
          aria-expanded={mobileFiltersOpen}
          aria-controls="recall-filter-card"
          onClick={() => setMobileFiltersOpen((o) => !o)}
          className="capsule capsule--sm capsule--ghost"
        >
          Filters{mobileFilterCount > 0 ? ` (${mobileFilterCount} active)` : ""}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform ease-over", mobileFiltersOpen && "rotate-180")} />
        </button>
      </div>

      <Sheet quiet id="recall-filter-card" className={cn("space-y-4 p-4 sm:p-5", !mobileFiltersOpen && "hidden md:block")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="recall-filters"
            onClick={() => setFiltersOpen((o) => !o)}
            className="capsule capsule--sm capsule--ghost -ml-3"
          >
            More filters{activeCount > 0 ? ` (${activeCount} active)` : ""}
            <ChevronDown aria-hidden className={cn("size-4 transition-transform ease-over", filtersOpen && "rotate-180")} />
          </button>
          <div className="flex items-center gap-2">
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw /> Reset
              </Button>
            )}
            {scopeToggle("hidden md:inline-flex")}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="recall-search" className="text-xs font-bold text-ink-2">
              Search recalls
            </label>
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2" />
              <Input
                id="recall-search"
                type="search"
                autoComplete="off"
                placeholder="Product, reason, or recalling firm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-11"
              />
            </div>
          </div>
          <fieldset className="min-w-0 space-y-1.5">
            <legend className="mb-1.5 text-xs font-bold text-ink-2">Where</legend>
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
            <legend className="mb-1.5 text-xs font-bold text-ink-2">What</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select label="Filter by agency" value={agencyFilter} onChange={setAgencyFilter} options={AGENCY_OPTIONS} />
              <Select label="Filter by contaminant type" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
            </div>
          </fieldset>
          <fieldset className="min-w-0 space-y-1.5">
            <legend className="mb-1.5 text-xs font-bold text-ink-2">How serious</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select label="Filter by severity class" value={classFilter} onChange={setClassFilter} options={CLASS_OPTIONS} />
              <Select label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
            </div>
          </fieldset>
        </div>
      </Sheet>

      {recalls.loading && <Loading className="h-32">Loading recalls from openFDA…</Loading>}
      {recalls.error && (
        <EmptyState>
          Couldn't reach the openFDA API ({recalls.error}).{" "}
          <button type="button" className="link" onClick={recalls.reload}>
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
                    {emptyRecovery}
                  </div>
                </>
              ) : (
                <>
                  <p>No recalls match these filters.</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {!archive && (
                      <Button size="sm" onClick={() => setArchive(true)}>
                        Include the archive
                      </Button>
                    )}
                    {emptyRecovery}
                  </div>
                </>
              )}
            </EmptyState>
          ) : (
            <div>
              {groups.slice(0, shown).map((g) => (
                <RecallRow key={g[0].id} recall={g[0]} showHaveIt="expanded">
                  {relatedTo.get(g[0].id) && (
                    <p className="mt-2 text-sm text-ink-2">
                      Same firm and product as{" "}
                      {relatedTo
                        .get(g[0].id)!
                        .map((o) => `#${o.recallNumber} (${formatFdaDate(o.reportDate ?? o.recallInitiationDate)})`)
                        .join(", ")}
                      ; listed separately because the agency filed them on different dates.
                    </p>
                  )}
                  {g.length > 1 && (
                    <div className={cn("mt-3 pt-1", recordRule)}>
                      <Disclosure label={`${g.length - 1} more notice${g.length - 1 === 1 ? "" : "s"} from this recall`}>
                        <ul className="space-y-3">
                          {g.slice(1).map((r) => {
                            const hasNum = Boolean(r.recallNumber) && !/^(n\/a|—|-|unknown)$/i.test(r.recallNumber.trim());
                            return (
                              <li key={r.id}>
                                <p className="line-clamp-3 text-sm text-ink-2">
                                  {repairEncoding(r.productDescription)}
                                </p>
                                <RecordLine
                                  className="mt-1.5"
                                  agency={agencyLabel(r.agency)}
                                  reference={hasNum ? `#${r.recallNumber}` : undefined}
                                  date={formatFdaDate(r.reportDate ?? r.recallInitiationDate) || undefined}
                                  url={r.url || undefined}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      </Disclosure>
                    </div>
                  )}
                </RecallRow>
              ))}
              {groups.length > 40 && (
                <div className="flex flex-col items-center gap-3 pt-6">
                  <p aria-live="polite" className="tnum text-sm text-ink-2">
                    Showing {Math.min(shown, groups.length)} of {groups.length} recalls
                  </p>
                  {shown < groups.length && (
                    <button
                      type="button"
                      onClick={() => setShown((n) => n + 40)}
                      className="capsule"
                    >
                      Show {Math.min(40, groups.length - shown)} more
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
              className="link inline-flex min-h-9 pointer-coarse:min-h-10 items-center gap-1.5 text-sm"
            >
              {defaultScope ? "Trend by month, current scope" : "Trend by month, archive"}
              <ChevronDown aria-hidden className={cn("size-4 transition-transform ease-over", trendOpen && "rotate-180")} />
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
