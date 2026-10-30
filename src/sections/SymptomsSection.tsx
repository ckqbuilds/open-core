import { Chip } from "@/components/ui/chip";
import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Ban,
  ChevronDown,
  Clock,
  ShieldAlert,
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
import { Button } from "@/components/ui/button";
import { Sheet, SourceLink } from "@/components/common";
import { cn, formatIsoShort } from "@/lib/utils";
import { CURATED_CHECKED_AT } from "@/data/outbreaks";

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
    <div className="space-y-8">
      <div className="prose-measure space-y-2">
        <p className="text-sm text-ink-2">
          What the signs of each foodborne illness look like, how long after eating they show up,
          and what CDC says to do. Every line is transcribed from the linked CDC page.
        </p>
        <p className="text-sm font-bold">
          This page cannot tell you what you have. Many of these illnesses share the same symptoms,
          and only a test can tell them apart. If you are ill, contact a healthcare provider.
        </p>
      </div>

      <RedFlagCard />

      <RiskGroupPicker
        groups={groups}
        onToggle={toggle}
        onClear={clear}
        urgentCount={urgentCount}
      />

      <div>
        {ordered.map((p) => (
          <PathogenCard
            key={p.id}
            pathogen={p}
            selected={selected}
            activeOutbreaks={activeByPathogen.get(p.id) ?? []}
          />
        ))}
      </div>

      <p className="max-w-[52ch] text-xs text-ink-2">
        Reference information only: not a diagnosis and not a prescription. Where CDC states a
        treatment fact, it is quoted with a citation; the decision to test or treat belongs to a
        healthcare provider. Your selected conditions stay in this browser and are never sent
        anywhere.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Urgent care: an ink-outlined sheet with a coral label chip. */
function RedFlagCard() {
  return (
    <Sheet className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 size-6 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-4">
          <h2 className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Chip color="coral">Get medical care now</Chip>
            <span className="display-md text-2xl">if any of these apply</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {RED_FLAGS.map((f) => (
              <li key={f} className="flex gap-3 text-sm">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-ink" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm">These apply to any of the illnesses below, whatever you think you have.</p>
          <SourceLink source={RED_FLAG_SOURCE} />
        </div>
      </div>
    </Sheet>
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
    <Sheet quiet id="risk-groups" className="scroll-mt-24 space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="risk-groups-heading" className="text-sm font-bold">Does any of this describe you or your household?</h3>
          <div className="prose-measure text-xs text-ink-2">
            CDC publishes different guidance for these groups. Selecting one adds that guidance to
            the cards below; nothing is hidden either way.
          </div>
        </div>
        {groups.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>

      <div role="group" aria-labelledby="risk-groups-heading" className="flex flex-wrap gap-2">
        {RISK_GROUPS.map((g) => {
          const on = groups.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(g.id)}
              className="capsule capsule--sm"
            >
              {g.short}
              <span aria-hidden className="capsule__chip" />
            </button>
          );
        })}
      </div>

      {urgentCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border-2 border-ink p-3 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {urgentCount === 1
              ? "1 illness below has guidance specific to what you selected, and it is shown first."
              : `${urgentCount} illnesses below have guidance specific to what you selected, and they are shown first.`}
          </span>
        </div>
      )}
    </Sheet>
  );
}

export function PathogenCard({
  pathogen: p,
  selected,
  activeOutbreaks,
}: {
  pathogen: Pathogen;
  selected: Set<RiskGroupId>;
  activeOutbreaks: Outbreak[];
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const notes = notesForGroups(p, selected);
  const urgent = notes.some((n) => n.severity === "urgent");
  const anyCurated = activeOutbreaks.some((o) => o.curated);

  return (
    <article className="row-rule flex flex-col gap-4 py-5 md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8 md:py-6">
      <div className="min-w-0 space-y-2">
        <div>
          <h3 className="text-lg font-extrabold">{p.name}</h3>
          {p.aka && <div className="text-sm text-ink-2">{p.aka}</div>}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {urgent && <Chip color="coral">Urgent for your selection</Chip>}
          <Chip color="lilac">{p.category}</Chip>
        </div>

        {activeOutbreaks.length > 0 && (
          <div className="space-y-1.5">
            <Chip color="coral">
              {activeOutbreaks.length === 1
                ? "Active outbreak"
                : `${activeOutbreaks.length} active outbreaks`}
            </Chip>
            {anyCurated && (
              <div className="text-xs text-ink-2">
                {`Curated list, checked ${formatIsoShort(CURATED_CHECKED_AT)}`}
              </div>
            )}
            <ul className="space-y-1 text-sm">
              {activeOutbreaks.map((o, i) => {
                // Unidentified foods read the same, so the FDA number tells them apart.
                const vehicle =
                  !o.vehicle || /not (yet )?identified/i.test(o.vehicle)
                    ? o.refId
                      ? `Food not yet identified (FDA #${o.refId})`
                      : "Food not yet identified"
                    : o.vehicle;
                return (
                  <li key={o.refId ?? `${o.vehicle}-${i}`}>
                    {o.refId ? (
                      <Link
                        to={`/outbreak/${o.refId}`}
                        className="link pointer-coarse:inline-block pointer-coarse:py-2"
                      >
                        {vehicle}
                        <ArrowRight className="ml-1 inline size-3.5 align-[-0.15em]" aria-hidden />
                      </Link>
                    ) : (
                      vehicle
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <p className="prose-measure text-base">{p.summary}</p>

        <dl className="prose-measure grid gap-4 sm:grid-cols-2">
          <Fact icon={<Clock className="size-3.5" aria-hidden />} label="Starts" value={p.onset} />
          <Fact icon={<Timer className="size-3.5" aria-hidden />} label="Lasts" value={p.duration} />
        </dl>

        {notes.length > 0 && (
          <div className="prose-measure space-y-4">
            {notes.map((n) => (
              <RiskNoteBlock key={`${n.group}-${n.severity}`} note={n} />
            ))}
          </div>
        )}

        <button
          type="button"
          className="capsule capsule--sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailsId}
        >
          {open ? "Hide details" : "Signs, spread & what to do"}
          <ChevronDown aria-hidden className={cn("size-4 shrink-0 transition-transform ease-over", open && "rotate-180")} />
        </button>

        {open && (
          <div id={detailsId} className="prose-measure space-y-4">
            <Block icon={<Activity className="size-3.5" aria-hidden />} title="Signs">
              <ul className="list-inside list-disc space-y-1 text-sm marker:text-ink-2">
                {p.signs.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Block>

            <Block title="How it spreads">
              <p className="text-sm">{p.spread}</p>
            </Block>

            <Block title="What to do">
              <ul className="space-y-2 text-sm">
                {p.care.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Block>

            {p.doNot && (
              <div className="rounded-lg border-2 border-coral p-3">
                <div className="mb-1 flex items-center gap-1.5 text-sm font-bold">
                  <Ban className="size-4" aria-hidden />
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

        <div>
          <SourceLink source={p.source} />
        </div>
      </div>
    </article>
  );
}

function RiskNoteBlock({ note }: { note: RiskNote }) {
  const urgent = note.severity === "urgent";
  return (
    <div className={cn("rounded-lg border-2 p-3", urgent ? "border-coral" : "border-rule")}>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-bold">
        {urgent && <ShieldAlert className="size-3.5" aria-hidden />}
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
    <div>
      <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-ink-2">
        {icon}
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
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
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
