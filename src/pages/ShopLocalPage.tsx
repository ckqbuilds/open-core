import { useState } from "react";
import { Card } from "@heroui/react";
import { ShoppingBasket } from "lucide-react";
import { MarketsSection } from "@/sections/MarketsSection";
import { DIRECTORIES } from "@/data/markets";
import { useZipContext } from "@/hooks/ZipContext";
import { ZipInput } from "@/components/ZipInput";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Shop-safer alternative: USDA local food directories near your ZIP. */
export function ShopLocalPage() {
  useDocumentTitle("Shop local · OpenCORE");
  const { geo } = useZipContext();
  const [listed, setListed] = useState(0);
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<ShoppingBasket className="size-6 text-primary" />}
        title="Shop local"
        description="Every local food source near you, with what each one offers — merged from all five USDA Local Food Directories. The directories list farmers markets, CSAs, on-farm markets, food hubs, and agritourism."
      />

      {!geo && (
        <div className="max-w-xs space-y-1.5">
          <label htmlFor="shop-zip" className="text-sm font-medium">
            Your ZIP
          </label>
          <ZipInput id="shop-zip" />
        </div>
      )}

      <MarketsSection geo={geo} onCount={setListed} />

      {/* What each directory type means, so people can pick the right one. */}
      <section>
        <h2 className="text-lg font-semibold">What are these?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The USDA tracks five kinds of local food sources.{" "}
          {listed > 0
            ? "Every one near you is listed together above; use the filter pills to narrow to a single kind."
            : "Enter your ZIP to list the ones near you."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DIRECTORIES.map((d) => (
            <Card key={d.id}>
              <Card.Content>
                <div className="font-medium">{d.label}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d.blurb}</p>
              </Card.Content>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
