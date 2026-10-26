import { InfoNote, Sheet, SourceLink } from "@/components/common";
import { CONTAMINANTS, type ContaminantInfo } from "@/data/contaminants";
import { HAZARD_ICONS } from "@/lib/icons";

/**
 * Teaches the four food-safety hazard types (+ the honest "other" bucket) and
 * is explicit that the per-recall badges elsewhere in the app are inferred from
 * the recall's reason text, not read from an official FDA field.
 */
export function ContaminationSection() {
  return (
    <div className="space-y-8">
      <div className="prose-measure space-y-2">
        <p className="text-sm text-ink-2">
          Food-safety investigators sort contamination into four hazard types:{" "}
          <span className="font-bold text-ink">biological</span>,{" "}
          <span className="font-bold text-ink">chemical</span>,{" "}
          <span className="font-bold text-ink">physical</span>, and{" "}
          <span className="font-bold text-ink">allergenic</span>. Knowing the type tells
          you what kind of hazard a recall describes at a glance. "Listeria", "elevated lead",
          "metal fragments", and "undeclared milk" are four very different problems.
        </p>
        <p className="text-sm text-ink-2">
          Not every recall is a contaminant, so we keep an honest fifth bucket for quality and
          labeling problems.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {CONTAMINANTS.map((c) => (
          <TypeCard key={c.id} info={c} />
        ))}
      </div>

      <InfoNote>
        On the Recalls page, each recall is tagged with a hazard type{" "}
        <span className="font-bold text-ink">
          categorized from its reason text; a guide, not an official FDA field
        </span>
        . The reason text is written for people, not machines, so the tag is a best-effort read of
        what the recall says. It never claims a product is safe.
      </InfoNote>
    </div>
  );
}

function TypeCard({ info }: { info: ContaminantInfo }) {
  const Icon = HAZARD_ICONS[info.id];
  return (
    <Sheet className="space-y-4 p-5">
      <div>
        <div className="flex items-center gap-2.5">
          <Icon aria-hidden className="size-5 shrink-0 text-land-deep" />
          <h3 className="display-md text-xl">{info.label}</h3>
        </div>
        <p className="mt-3 text-sm text-ink-2">{info.blurb}</p>
      </div>
      {info.subcategories.length > 0 && (
        <ul>
          {info.subcategories.map((s) => (
            <li key={s.name} className="row-rule py-2">
              <div className="text-sm font-bold">{s.name}</div>
              <div className="mt-0.5 text-sm text-ink-2">{s.examples}</div>
            </li>
          ))}
        </ul>
      )}
      {info.source && <SourceLink source={info.source} />}
    </Sheet>
  );
}
