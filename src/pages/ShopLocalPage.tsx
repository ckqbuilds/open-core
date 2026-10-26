import { useState } from "react";
import { MarketsSection } from "@/sections/MarketsSection";
import { DIRECTORIES } from "@/data/markets";
import { useZipContext } from "@/hooks/ZipContext";
import { ZipInput } from "@/components/ZipInput";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { SectionHeading } from "@/components/common";

/** Shop-safer alternative: USDA local food directories near your ZIP. */
export function ShopLocalPage() {
  useDocumentTitle("Shop local · OpenCORE");
  const { geo } = useZipContext();
  const [listed, setListed] = useState(0);
  return (
    <div className="space-y-10">
      <PageHeader
        title="Shop local"
        description="Every local food source near you, with what each one offers — merged from all five USDA Local Food Directories. The directories list farmers markets, CSAs, on-farm markets, food hubs, and agritourism."
      />

      {!geo && (
        <div className="max-w-sm space-y-2">
          <label htmlFor="shop-zip" className="block text-sm font-bold">
            Your ZIP
          </label>
          <ZipInput id="shop-zip" describedBy="shop-zip-help" />
          <p id="shop-zip-help" className="text-sm text-ink-2">
            Enter your ZIP to list the USDA local food directories near you
          </p>
        </div>
      )}

      <MarketsSection geo={geo} onCount={setListed} />

      {/* What each directory type means, so people can pick the right one. */}
      <section className="space-y-4">
        <div className="space-y-2">
          <SectionHeading>What are these?</SectionHeading>
          <p className="prose-measure text-sm text-ink-2">
          The USDA tracks five kinds of local food sources.{" "}
          {listed > 0
            ? "Every one near you is listed together above; use the filter pills to narrow to a single kind."
            : "Enter your ZIP to list the ones near you."}
          </p>
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {DIRECTORIES.map((d) => (
            <div key={d.id} className="row-rule py-3">
              <div className="font-bold">{d.label}</div>
              <p className="mt-1 text-sm text-ink-2">{d.blurb}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
