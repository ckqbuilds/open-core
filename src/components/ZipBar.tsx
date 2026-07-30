import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ZipBarProps {
  zip: string;
  onZip: (v: string) => void;
  place?: string | null;
  loading?: boolean;
  error?: string | null;
}

export function ZipBar({ zip, onZip, place, loading, error }: ZipBarProps) {
  return (
    <div className="w-full max-w-sm">
      <label htmlFor="zip" className="mb-1.5 block text-sm font-medium">
        Your ZIP code
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        <Input
          id="zip"
          inputMode="numeric"
          maxLength={5}
          placeholder="e.g. 93901"
          className="pl-9"
          value={zip}
          onChange={(e) => onZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
        />
      </div>
      <p className="mt-1.5 h-4 text-xs">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : place ? (
          <span className="text-muted-foreground">Showing results near {place}</span>
        ) : (
          <span className="text-muted-foreground">Enter a 5-digit ZIP to find results near you</span>
        )}
      </p>
    </div>
  );
}
