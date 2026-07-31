import { MarketsSection } from "@/sections/MarketsSection";
import { useZipContext } from "@/hooks/ZipContext";

/** Shop-safer alternative: farmers markets near your ZIP. */
export function ShopLocalPage() {
  const { geo } = useZipContext();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Shop local</h1>
        <p className="text-sm text-muted-foreground">
          Farmers markets near you. Buying whole, local produce and washing it yourself lets you
          control handling and sidestep recalled pre-packaged products.
        </p>
      </div>
      <MarketsSection geo={geo} />
    </div>
  );
}
