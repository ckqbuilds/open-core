import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useZipContext } from "@/hooks/ZipContext";
import { cn } from "@/lib/utils";

/** The shared ZIP field, bound to the persisted ZIP context. */
export function ZipInput({ id, describedBy, className }: { id: string; describedBy?: string; className?: string }) {
  const { zip, setZip, geoLoading, geoError } = useZipContext();
  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2" aria-hidden />
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
        className="tnum pl-11 pr-10 font-semibold"
      />
      {geoLoading && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin" aria-hidden />}
    </div>
  );
}
