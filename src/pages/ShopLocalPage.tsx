import { ShoppingBasket } from "lucide-react";
import { MarketsSection } from "@/sections/MarketsSection";
import { DIRECTORIES } from "@/data/markets";
import { useZipContext } from "@/hooks/ZipContext";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";

/** Shop-safer alternative: USDA local food directories near your ZIP. */
export function ShopLocalPage() {
  const { geo } = useZipContext();
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<ShoppingBasket className="size-6 text-primary" />}
        title="Shop local"
        description="Every local food source near you, with what each one offers — merged from all five USDA Local Food Directories. Buying whole, local produce and washing it yourself lets you control handling and sidestep recalled pre-packaged products."
      />

      <MarketsSection geo={geo} />

      {/* What each directory type means, so people can pick the right one. */}
      <section>
        <h2 className="text-lg font-semibold">What are these?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The USDA tracks five kinds of local food sources. Every one near you is listed together
          above; use the filter pills to narrow to a single kind.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DIRECTORIES.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="font-medium">{d.label}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
