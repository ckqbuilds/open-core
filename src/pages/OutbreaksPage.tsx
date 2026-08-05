import { useMemo } from "react";
import { AlertTriangle, Users, FileWarning, FileText } from "lucide-react";
import { Spinner } from "@heroui/react";
import { loadOutbreaks, type LiveOutbreaks } from "@/data/outbreaksLive";
import { useAsync } from "@/hooks/useAsync";
import { OutbreakTile } from "@/components/OutbreakTile";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/common";

/** Home: KPI row over every active FDA CORE outbreak, each tile linking out. */
export function OutbreaksPage() {
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
      detailed: active.filter((o) => o.detailed).length,
    };
  }, [active]);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<AlertTriangle className="size-6 text-[var(--status-critical)]" />}
        title="Active outbreaks"
        description="Every active foodborne-illness investigation on the FDA CORE table. Open one for its cases, the companies named in the record, related recalls, how to recognize the illness, and named locations near you."
        actions={<FreshnessBadge live={outbreaks.data} loading={outbreaks.loading} />}
      />

      {outbreaks.loading ? (
        <div className="flex h-40 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Spinner size="lg" /> Loading FDA outbreak table…
        </div>
      ) : active.length === 0 ? (
        <EmptyState>No active outbreaks are being tracked right now.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Active investigations"
              value={stats.count}
              icon={<AlertTriangle className="size-4" />}
              tone="critical"
            />
            <StatCard
              label="Reported cases"
              value={stats.cases.toLocaleString()}
              icon={<Users className="size-4" />}
              hint="across tracked outbreaks"
            />
            <StatCard
              label="With a recall"
              value={stats.withRecall}
              icon={<FileWarning className="size-4" />}
              tone="accent"
            />
            <StatCard
              label="Detailed profiles"
              value={stats.detailed}
              icon={<FileText className="size-4" />}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((ob) => (
              <OutbreakTile key={ob.id} outbreak={ob} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
