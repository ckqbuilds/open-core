import { Link } from "react-router-dom";
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
}: {
  value: string;
  onChange: (v: string) => void;
  result: FrontDoorResult | null;
}) {
  const { geo, geoError } = useZipContext();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="relative">
          <label htmlFor="home-search" className="sr-only">
            Search a food or brand
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2" aria-hidden />
          <Input
            id="home-search"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Search a food or brand"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-11"
          />
        </div>
        <div>
          <label htmlFor="home-zip" className="sr-only">
            Your ZIP
          </label>
          <ZipInput id="home-zip" describedBy="home-zip-note" />
        </div>
      </div>

      {result && (
        <p role="status" aria-live="polite" className="text-sm text-ink-2">
          {result.foods === 0 && result.recalls === 0 ? (
            <>No matches for '{result.query}'.</>
          ) : (
            <>
              <span className="tnum">{result.foods}</span> food{result.foods === 1 ? "" : "s"} ·{" "}
              <Link to={`/recalls?q=${encodeURIComponent(result.query)}&archive=1&scope=all`} className="link">
                <span className="tnum">{result.recalls}</span> recall{result.recalls === 1 ? "" : "s"}
              </Link>{" "}
              match '{result.query}'
            </>
          )}
        </p>
      )}

      {geoError && (
        <p id="home-zip-note" role="status" className="text-sm font-semibold text-[color:var(--status-critical)]">
          {geoError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p id={geoError ? undefined : "home-zip-note"} className="text-sm text-ink-2">
          {geoError ? null : geo ? (
            <>
              Showing {geo.place}, {geo.stateAbbr}. Your ZIP stays in this browser.
            </>
          ) : (
            <>Unlocks recalls reaching your state, named locations near you, local sources.</>
          )}
        </p>
        {!(result && result.foods === 0 && result.recalls === 0) && (
          <Link to="/recalls#check" className="capsule capsule--sun shrink-0 self-start">
            <ScanBarcode className="size-4" aria-hidden /> Check a barcode
            <span aria-hidden className="capsule__chip" />
          </Link>
        )}
      </div>
    </div>
  );
}
