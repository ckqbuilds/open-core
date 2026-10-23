import { Link } from "react-router-dom";
import { Card } from "@heroui/react";
import { Loader2, MapPin, ScanBarcode, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { useZipContext } from "@/hooks/ZipContext";
import { cn } from "@/lib/utils";

export interface FrontDoorResult {
  query: string;
  foods: number;
  recalls: number;
}

/** The top of home: search a food or brand, add a ZIP, or check a barcode. */
export function FrontDoor({
  value,
  onChange,
  result,
}: {
  value: string;
  onChange: (v: string) => void;
  result: FrontDoorResult | null;
}) {
  const { zip, setZip, geo, geoLoading, geoError } = useZipContext();
  return (
    <Card className="gap-5 p-5">
      <div className="space-y-1.5">
        <label htmlFor="home-search" className="text-sm font-medium">
          Search a food or brand
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="home-search"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="romaine, cheese, a brand name"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-9 text-base sm:text-sm"
          />
        </div>
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
          {result &&
            (result.foods === 0 && result.recalls === 0 ? (
              <>No food or recall record mentions '{result.query}'. Try a plainer word, or check a barcode.</>
            ) : (
              <>
                <span className="tabular-nums">{result.foods}</span> food{result.foods === 1 ? "" : "s"} ·{" "}
                <Link
                  to="/recalls"
                  className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="tabular-nums">{result.recalls}</span> recall{result.recalls === 1 ? "" : "s"}
                </Link>{" "}
                match '{result.query}'
              </>
            ))}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <label htmlFor="home-zip" className="text-sm font-medium">
            Your ZIP
          </label>
          <div className="relative sm:w-40">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="home-zip"
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
              placeholder="ZIP code"
              aria-invalid={geoError ? true : undefined}
              aria-describedby="home-zip-note"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className={cn("pl-9 pr-9 text-base tabular-nums sm:text-sm", geoError && "border-destructive")}
            />
            {geoLoading && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        <p id="home-zip-note" className="min-w-0 flex-1 text-sm text-muted-foreground sm:max-w-md">
          {geoError ? (
            <span role="status" className="text-destructive">{geoError}</span>
          ) : geo ? (
            <>Showing {geo.place}, {geo.stateAbbr}. Your ZIP stays in this browser.</>
          ) : (
            <>
              Add your ZIP to see which recalls reach your state, the named store locations near you,
              and local food sources. It stays in this browser and is only used to look up your location.
            </>
          )}
        </p>
        <Link
          to="/recalls#check"
          className={cn(buttonVariants({ variant: "secondary" }), "shrink-0")}
        >
          <ScanBarcode /> Check a product barcode
        </Link>
      </div>
    </Card>
  );
}
