import { Chip } from "@/components/ui/chip";
import { useState } from "react";
import { ChevronDown, Sprout } from "lucide-react";
import { GROW_GUIDES, type GrowGuide } from "@/data/grow";
import { Sheet } from "@/components/common";
import { cn } from "@/lib/utils";

export function GrowSection() {
  return (
    <div className="space-y-6">
      <p className="prose-measure text-sm text-ink-2">
        The surest way to know how your food was handled is to grow it. These guides go from a
        windowsill tray to a backyard bed. Pick where you have room and time.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {GROW_GUIDES.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </div>
    </div>
  );
}

function GuideCard({ guide }: { guide: GrowGuide }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet className="space-y-4 p-5">
      <div>
        <div className="flex items-center gap-2.5">
          <Sprout className="size-5 shrink-0 text-land-deep" aria-hidden />
          <h3 className="display-md text-xl">{guide.title}</h3>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip color="quiet">{guide.difficulty}</Chip>
          <Chip color="outline">{guide.timeToHarvest}</Chip>
        </div>
        <p className="mt-3 text-sm text-ink-2">{guide.blurb}</p>
      </div>
      <button type="button" className="capsule w-full justify-between" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide steps" : `Show ${guide.steps.length} steps`}
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 transition-transform ease-over", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-4">
          <ol className="space-y-3">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="tnum flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-extrabold text-ground">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-bold">{s.heading}</div>
                  <div className="text-sm text-ink-2">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-lg border border-rule bg-ground p-3">
            <div className="mb-1 text-xs font-bold text-ink-2">Tips</div>
            <ul className="list-inside list-disc space-y-1 text-sm marker:text-ink-2">
              {guide.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Sheet>
  );
}
