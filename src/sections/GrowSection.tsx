import { useState } from "react";
import { ChevronDown, Sprout } from "lucide-react";
import { GROW_GUIDES, type GrowGuide } from "@/data/grow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function GrowSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The surest way to know how your food was handled is to grow it. These guides go from a
        windowsill tray to a backyard bed — pick where you have room and time.
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sprout className="size-5 text-accent" />
          <CardTitle className="text-base">{guide.title}</CardTitle>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">{guide.difficulty}</Badge>
          <Badge variant="outline">{guide.timeToHarvest}</Badge>
        </div>
        <p className="pt-2 text-sm text-muted-foreground">{guide.blurb}</p>
      </CardHeader>
      <CardContent>
        <button
          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide steps" : `Show ${guide.steps.length} steps`}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="mt-4 space-y-4">
            <ol className="space-y-3">
              {guide.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{s.heading}</div>
                    <div className="text-sm text-muted-foreground">{s.body}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="rounded-md bg-secondary/60 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tips
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {guide.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
