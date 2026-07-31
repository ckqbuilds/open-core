import { useMemo } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { loadOutbreaks, type LiveOutbreaks } from "@/data/outbreaksLive";
import { useAsync } from "@/hooks/useAsync";
import { OutbreakTile } from "@/components/OutbreakTile";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { EmptyState } from "@/components/common";

/** Home: every active FDA CORE outbreak as a tile that links to its own page. */
export function OutbreaksPage() {
  const outbreaks = useAsync<LiveOutbreaks>((signal) => loadOutbreaks(signal), []);

  const activeOutbreaks = useMemo(() => {
    const list = outbreaks.data?.outbreaks ?? [];
    return list
      .filter((o) => o.status === "active")
      .sort((a, b) => {
        if (a.detailed !== b.detailed) return a.detailed ? -1 : 1;
        return (b.caseCount ?? 0) - (a.caseCount ?? 0);
      });
  }, [outbreaks.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-[var(--status-critical)]" />
          <h1 className="text-xl font-semibold tracking-tight">
            Active outbreaks
            {activeOutbreaks.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {activeOutbreaks.length} tracked
              </span>
            )}
          </h1>
        </div>
        <FreshnessBadge live={outbreaks.data} loading={outbreaks.loading} />
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground">
        Every active foodborne-illness investigation on the FDA CORE table. Tap one to see everything
        tracked for it — cases, the companies named in the record, related recalls, how to recognize
        the illness, and named locations near you.
      </p>

      {outbreaks.loading ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Loading FDA outbreak table…
        </div>
      ) : activeOutbreaks.length === 0 ? (
        <EmptyState>No active outbreaks are being tracked right now.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeOutbreaks.map((ob) => (
            <OutbreakTile key={ob.id} outbreak={ob} />
          ))}
        </div>
      )}
    </div>
  );
}
