import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  ChevronDown,
  Clock,
  RadioTower,
  ShieldAlert,
  Stethoscope,
  Timer,
} from "lucide-react";
import {
  PATHOGENS,
  RED_FLAGS,
  RED_FLAG_SOURCE,
  RISK_GROUPS,
  hasUrgentNote,
  matchesOutbreakPathogen,
  notesForGroups,
  riskGroupLabel,
  type Pathogen,
  type RiskGroupId,
  type RiskNote,
} from "@/data/symptoms";
import { loadOutbreaks, type LiveOutbreaks } from "@/data/outbreaksLive";
import type { Outbreak } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { useRiskGroups } from "@/hooks/useRiskGroups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceLink } from "@/components/common";
import { cn } from "@/lib/utils";

export function SymptomsSection() {
  const { groups, selected, toggle, clear } = useRiskGroups();
  const outbreaks = useAsync<LiveOutbreaks>((signal) => loadOutbreaks(signal), []);

  /** Active outbreaks in the live feed, grouped by the pathogen card they match. */
  const activeByPathogen = useMemo(() => {
    const map = new Map<string, Outbreak[]>();
    for (const o of outbreaks.data?.outbreaks ?? []) {
      if (o.status !== "active") continue;
      for (const p of PATHOGENS) {
        if (!matchesOutbreakPathogen(p, o.pathogen)) continue;
        map.set(p.id, [...(map.get(p.id) ?? []), o]);
      }
    }
    return map;
  }, [outbreaks.data]);

  /**
   * Order: pathogens with urgent guidance for the selected conditions first,
   * then ones with an active outbreak, then the rest alphabetically. Keeps the
   * most decision-relevant card at the top without hiding anything.
   */
  const ordered = useMemo(() => {
    return [...PATHOGENS].sort((a, b) => {
      const urgent = Number(hasUrgentNote(b, selected)) - Number(hasUrgentNote(a, selected));
      if (urgent !== 0) return urgent;
      const live = Number(activeByPathogen.has(b.id)) - Number(activeByPathogen.has(a.id));
      if (live !== 0) return live;
      return a.name.localeCompare(b.name);
    });
  }, [selected, activeByPathogen]);

  const urgentCount = ordered.filter((p) => hasUrgentNote(p, selected)).length;

  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <p className="text-sm text-muted-foreground">
          What the signs of each foodborne illness look like, how long after eating they show up,
          and what CDC says to do. Every line is transcribed from the linked CDC page.
        </p>
        <p className="text-sm font-medium text-foreground">
          This page cannot tell you what you have. Many of these illnesses share the same symptoms,
          and only a test can tell them apart — if you are ill, contact a healthcare provider.
        </p>
      </div>

      <RedFlagCard />

      <RiskGroupPicker
        groups={groups}
        onToggle={toggle}
        onClear={clear}
        urgentCount={urgentCount}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {ordered.map((p) => (
          <PathogenCard
            key={p.id}
            pathogen={p}
            selected={selected}
            activeOutbreaks={activeByPathogen.get(p.id) ?? []}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Reference information only — not a diagnosis and not a prescription. Where CDC states a
        treatment fact, it is quoted with a citation; the decision to test or treat belongs to a
        healthcare provider. Your selected conditions stay in this browser and are never sent
        anywhere.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RedFlagCard() {
  return (
    <Card className="border-[color:var(--status-critical)]/40 bg-[color:var(--status-critical)]/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-[color:var(--status-critical)]" />
          <CardTitle className="text-base">Get medical care now if any of these apply</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="grid gap-2 sm:grid-cols-2">
          {RED_FLAGS.map((f) => (
            <li key={f} className="flex gap-2 text-sm">
              <span
                aria-hidden
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color:var(--status-critical)]"
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          These apply to any of the illnesses below, whatever you think you have.
        </p>
        <SourceLink source={RED_FLAG_SOURCE} />
      </CardContent>
    </Card>
  );
}

function RiskGroupPicker({
  groups,
  onToggle,
  onClear,
  urgentCount,
}: {
  groups: RiskGroupId[];
  onToggle: (id: RiskGroupId) => void;
  onClear: () => void;
  urgentCount: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Does any of this describe you or your household?</div>
            <div className="text-xs text-muted-foreground">
              CDC publishes different guidance for these groups. Selecting one adds that guidance to
              the cards below — nothing is hidden either way.
            </div>
          </div>
          {groups.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {RISK_GROUPS.map((g) => {
            const on = groups.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(g.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                )}
              >
                {g.short}
              </button>
            );
          })}
        </div>

        {urgentCount > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-[color:var(--status-critical)]/10 p-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[color:var(--status-critical)]" />
            <span>
              {urgentCount === 1
                ? "1 illness below has guidance specific to what you selected — it is shown first."
                : `${urgentCount} illnesses below have guidance specific to what you selected — they are shown first.`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PathogenCard({
  pathogen: p,
  selected,
  activeOutbreaks,
}: {
  pathogen: Pathogen;
  selected: Set<RiskGroupId>;
  activeOutbreaks: Outbreak[];
}) {
  const [open, setOpen] = useState(false);
  const notes = notesForGroups(p, selected);
  const urgent = notes.some((n) => n.severity === "urgent");

  return (
    <Card className={cn(urgent && "border-[color:var(--status-critical)]/40")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="size-5 text-accent" />
            <div>
              <CardTitle className="text-base">{p.name}</CardTitle>
              {p.aka && <div className="text-xs text-muted-foreground">{p.aka}</div>}
            </div>
          </div>
          <Badge variant="secondary">{p.category}</Badge>
        </div>

        {activeOutbreaks.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2 text-xs font-medium text-[color:var(--status-critical)]">
            <RadioTower className="size-3.5" />
            {activeOutbreaks.length === 1
              ? `Active outbreak in the current FDA data — ${activeOutbreaks[0].vehicle}`
              : `${activeOutbreaks.length} active outbreaks in the current FDA data`}
          </div>
        )}

        <p className="pt-2 text-sm text-muted-foreground">{p.summary}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Fact icon={<Clock className="size-3.5" />} label="Starts" value={p.onset} />
          <Fact icon={<Timer className="size-3.5" />} label="Lasts" value={p.duration} />
        </div>

        {notes.map((n) => (
          <RiskNoteBlock key={`${n.group}-${n.severity}`} note={n} />
        ))}

        <button
          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide details" : "Signs, spread & what to do"}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="space-y-4">
            <Block icon={<Activity className="size-3.5" />} title="Signs">
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {p.signs.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Block>

            <Block title="How it spreads">
              <p className="text-sm text-muted-foreground">{p.spread}</p>
            </Block>

            <Block title="What to do">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {p.care.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Block>

            {p.doNot && (
              <div className="rounded-md border border-[color:var(--status-critical)]/40 bg-[color:var(--status-critical)]/5 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--status-critical)]">
                  <Ban className="size-3.5" />
                  Do not
                </div>
                <ul className="space-y-1 text-sm">
                  {p.doNot.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <SourceLink source={p.source} />
      </CardContent>
    </Card>
  );
}

function RiskNoteBlock({ note }: { note: RiskNote }) {
  const urgent = note.severity === "urgent";
  return (
    <div
      className={cn(
        "rounded-md p-3",
        urgent
          ? "border border-[color:var(--status-critical)]/40 bg-[color:var(--status-critical)]/5"
          : "bg-secondary/60"
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
          urgent ? "text-[color:var(--status-critical)]" : "text-muted-foreground"
        )}
      >
        {urgent && <ShieldAlert className="size-3.5" />}
        {riskGroupLabel(note.group)}
      </div>
      <p className="text-sm">{note.text}</p>
      <div className="pt-1.5">
        <SourceLink source={note.source} />
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-secondary/60 p-3">
      <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function Block({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
