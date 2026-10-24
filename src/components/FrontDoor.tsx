import { Link } from "react-router-dom";
import { Card } from "@heroui/react";
import { ScanBarcode, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ZipInput } from "@/components/ZipInput";
import { useZipContext } from "@/hooks/ZipContext";

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
  reach,
}: {
  value: string;
  onChange: (v: string) => void;
  result: FrontDoorResult | null;
  /** Recalls on record that reach the ZIP's state, when a ZIP is set. */
  reach?: number | null;
}) {
  const { geo, geoError } = useZipContext();
  return (
    <Card className="gap-3 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_11rem] sm:items-start">
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
              placeholder="romaine or a brand"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="pl-9 text-base sm:text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="home-zip" className="text-sm font-medium">
            Your ZIP
          </label>
          <ZipInput id="home-zip" describedBy="home-zip-note" />
        </div>
      </div>

      {result && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {result.foods === 0 && result.recalls === 0 ? (
            <>No matches for '{result.query}'.</>
          ) : (
            <>
              <span className="tabular-nums">{result.foods}</span> food{result.foods === 1 ? "" : "s"} ·{" "}
              <Link
                to={`/recalls?q=${encodeURIComponent(result.query)}&archive=1&scope=all`}
                className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="tabular-nums">{result.recalls}</span> recall{result.recalls === 1 ? "" : "s"}
              </Link>{" "}
              match '{result.query}'
            </>
          )}
        </p>
      )}

      {geoError && (
        <p id="home-zip-note" role="status" className="text-sm text-[color:var(--status-critical)]">
          {geoError}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p id={geoError ? undefined : "home-zip-note"} className="text-sm text-muted-foreground">
          {geoError ? null : geo ? (
            <>Showing {geo.place}, {geo.stateAbbr}{reach != null && <> · {reach} recall{reach === 1 ? "" : "s"} reach your state</>}. Your ZIP stays in this browser.</>
          ) : (
            <>Unlocks recalls reaching your state, named locations near you, local sources.</>
          )}
        </p>
        {!(result && result.foods === 0 && result.recalls === 0) && (
          <Link
            to="/recalls#check"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-md border border-border px-3 text-sm font-medium text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ScanBarcode className="size-4" /> Check a product barcode
          </Link>
        )}
      </div>
    </Card>
  );
}
