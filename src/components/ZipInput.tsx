import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useZipContext } from "@/hooks/ZipContext";
import { cn } from "@/lib/utils";

/** The shared ZIP field, bound to the persisted ZIP context. */
export function ZipInput({ id, describedBy }: { id: string; describedBy?: string }) {
  const { zip, setZip, geoLoading, geoError } = useZipContext();
  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        inputMode="numeric"
        maxLength={5}
        autoComplete="postal-code"
        placeholder="ZIP code"
        aria-invalid={geoError ? true : undefined}
        aria-describedby={describedBy}
        value={zip}
        onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
        className={cn("pl-9 pr-9 text-base tabular-nums sm:text-sm", geoError && "border-destructive")}
      />
      {geoLoading && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
