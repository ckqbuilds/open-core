import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ScanBarcode, Loader2, Search } from "lucide-react";
import { lookupBarcode, type OffProduct } from "@/data/openfoodfacts";
import { fetchRelevantRecalls } from "@/data/openfda";
import { loadFsisRecalls } from "@/data/fsis";
import { matchRecalls } from "@/data/barcodeMatch";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InfoNote } from "@/components/common";
import { BarcodeVerdict } from "@/components/BarcodeVerdict";

// NOTE: camera scanning is a deferred follow-up for a future version — it needs
// a barcode-decoder library plus camera-permission handling, which we're not
// adding in v1. Manual entry (type or paste the number) only for now.

interface CheckResult {
  off: OffProduct | null;
  matches: Recall[];
}

/**
 * In-store barcode → recall check.
 *
 * A shopper types/pastes a product barcode. Open Food Facts resolves it to a
 * product identity (name/brand) — it is only the "what is this", never an
 * authority. We then match that identity, and the raw code, against the current
 * FDA + USDA FSIS recall feeds, which are the source of truth for the verdict.
 */
export function CheckPage() {
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const result = useAsync<CheckResult>(
    async (signal) => {
      // Open Food Facts is identity-only: if it errors or misses, we degrade to
      // null and still run the recall text-match against the raw code below.
      let off: OffProduct | null = null;
      try {
        off = await lookupBarcode(code, signal);
      } catch (err) {
        if (signal.aborted) throw err;
        off = null;
      }

      // Recall feeds are the authority — CALL the existing loaders, unchanged.
      const [fda, fsis] = await Promise.all([
        fetchRelevantRecalls(250, signal),
        loadFsisRecalls(signal),
      ]);
      const recalls = [...fda, ...fsis.recalls];

      return { off, matches: matchRecalls(off, code, recalls) };
    },
    [code],
    code.length >= 8
  );

  const off = result.data?.off ?? null;
  const offMissed = !result.loading && !result.error && code.length >= 8 && !off;

  const brandHint = useMemo(() => {
    const term = off?.brands[0] ?? off?.name;
    return term ? encodeURIComponent(term) : null;
  }, [off]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = input.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 14) {
      setInputError("Enter the barcode number — 8 to 14 digits.");
      return;
    }
    setInputError(null);
    setCode(digits);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<ScanBarcode className="size-6 text-primary" />}
        eyebrow="In store"
        title="Check a product"
        description="Type or paste a product's barcode number to see whether it's named in a current FDA or USDA FSIS recall. Open Food Facts identifies the product; the FDA/FSIS record is the source of truth."
      />

      <Card>
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="barcode" className="mb-1 block text-sm font-medium">
                Barcode number
              </label>
              <input
                id="barcode"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 737628064502"
                maxLength={14}
                value={input}
                onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 14))}
                aria-invalid={inputError ? true : undefined}
                aria-describedby={inputError ? "barcode-error" : undefined}
                className="h-10 w-full min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" disabled={result.loading}>
              {result.loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <Search className="size-4" /> Check
                </>
              )}
            </Button>
          </form>
          {inputError && (
            <p id="barcode-error" className="mt-2 text-sm text-[var(--status-critical)]">
              {inputError}
            </p>
          )}
        </CardContent>
      </Card>

      {result.loading && (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Looking up the product and checking
          recalls…
        </div>
      )}

      {result.error && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="font-medium">Couldn't complete the check ({result.error}).</p>
            <button className="mt-1 text-primary hover:underline" onClick={result.reload}>
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {!result.loading && !result.error && result.data && (
        <div className="space-y-4">
          <BarcodeVerdict matches={result.data.matches} />

          {/* Resolved product identity (or the raw code, if OFF had no record). */}
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              {off?.imageUrl && (
                <img
                  src={off.imageUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-md border object-contain"
                />
              )}
              <div className="min-w-0">
                {off ? (
                  <>
                    <p className="truncate text-sm font-medium">
                      {off.name ?? "Unnamed product"}
                    </p>
                    {off.brands.length > 0 && (
                      <p className="truncate text-sm text-muted-foreground">
                        {off.brands.join(", ")}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      Barcode {off.code} · identified via Open Food Facts
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium tabular-nums">Barcode {code}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Open Food Facts has no record for this code, so we matched recalls on the
                      number alone. You can still search recalls by brand or food name.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Never dead-end: offer a brand/food search path into the recall feed. */}
          {(offMissed || result.data.matches.length === 0) && (
            <Card className="border-dashed">
              <CardContent className="p-4 text-sm">
                <p className="font-medium">Want to double-check by name?</p>
                <p className="mt-1 text-muted-foreground">
                  Barcode coverage is uneven. Browse the full{" "}
                  <Link className="text-primary hover:underline" to="/recalls">
                    active recalls
                  </Link>{" "}
                  feed and filter by agency or severity
                  {brandHint ? (
                    <>
                      , or search for{" "}
                      <span className="font-medium text-foreground">
                        {off?.brands[0] ?? off?.name}
                      </span>
                    </>
                  ) : null}
                  .
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <InfoNote>
        <p className="font-medium text-foreground">How this works</p>
        <p className="mt-1">
          Open Food Facts turns the barcode into a product name and brand — it only identifies the
          item and is not a safety authority. We then check that identity, and the raw number,
          against the current FDA (openFDA food enforcement) and USDA FSIS recall records, which are
          the source of truth. A "not named" result is not a guarantee of safety, and this is not
          medical advice — always confirm against the official FDA and CDC sources.
        </p>
      </InfoNote>
    </div>
  );
}
