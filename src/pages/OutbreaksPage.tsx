import { useMemo } from "react";
import { loadOutbreaks, type LiveOutbreaks } from "@/data/outbreaksLive";
import { useAsync } from "@/hooks/useAsync";
import { OutbreakTile } from "@/components/OutbreakTile";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { KeyButton } from "@/components/KeyButton";
import { EmptyState, Loading } from "@/components/common";

/** Every active FDA CORE outbreak as an outlined sheet, each linking to its page. */
export function OutbreaksPage() {
  useDocumentTitle("Active outbreaks · OpenCORE");
  const outbreaks = useAsync<LiveOutbreaks>((signal) => loadOutbreaks(signal), []);

  const active = useMemo(() => {
    const list = outbreaks.data?.outbreaks ?? [];
    return list
      .filter((o) => o.status === "active")
      .sort((a, b) => {
        if (a.detailed !== b.detailed) return a.detailed ? -1 : 1;
        return (b.caseCount ?? 0) - (a.caseCount ?? 0);
      });
  }, [outbreaks.data]);

  const stats = useMemo(() => {
    const cases = active.reduce((sum, o) => sum + (o.caseCount ?? 0), 0);
    return {
      count: active.length,
      cases,
      withRecall: active.filter((o) => o.recallInitiated).length,
    };
  }, [active]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Active outbreaks"
        description="Every active foodborne-illness investigation on the FDA CORE table. Open one for its cases, the companies named in the record, related recalls, how to recognize the illness, and named locations near you."
        actions={
          <>
            <KeyButton />
            <FreshnessBadge live={outbreaks.data} loading={outbreaks.loading} />
          </>
        }
      />

      {outbreaks.loading ? (
        <Loading className="h-32">Loading FDA outbreak table…</Loading>
      ) : active.length === 0 ? (
        <EmptyState>No active outbreaks are being tracked right now.</EmptyState>
      ) : (
        <>
          <p className="text-sm text-ink-2">
            <span className="tnum">{stats.count}</span> active investigation{stats.count === 1 ? "" : "s"} ·{" "}
            {stats.cases.toLocaleString()} reported case{stats.cases === 1 ? "" : "s"} ·{" "}
            <span className="tnum">{stats.withRecall}</span> with a recall
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((ob) => (
              <OutbreakTile key={ob.id} outbreak={ob} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
