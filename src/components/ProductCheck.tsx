import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { lookupBarcode, type OffProduct } from "@/data/openfoodfacts";
import { matchRecalls } from "@/data/barcodeMatch";
import type { Recall } from "@/data/types";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoNote, Loading, Sheet } from "@/components/common";
import { BarcodeVerdict } from "@/components/BarcodeVerdict";

// NOTE: camera scanning is a deferred backlog feature — it needs an on-device
// barcode decoder plus a secure (HTTPS) context for getUserMedia. Manual entry
// (type or paste the number) only for now.

/**
 * In-store barcode → recall check, embedded on the Recalls page.
 *
 * A shopper types/pastes a product barcode. Open Food Facts resolves it to a
 * product identity (name/brand) — only the "what is this", never an authority.
 * We match that identity, and the raw code, against the recall feed the Recalls
 * page already loaded (`recalls` prop = FDA + USDA FSIS), which is the source of
 * truth for the verdict.
 */
export function ProductCheck({ recalls, feedNote }: { recalls: Recall[]; feedNote?: string | null }) {
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Open Food Facts is identity-only: if it errors or misses, degrade to null
  // and still run the recall match against the raw code.
  const lookup = useAsync<OffProduct | null>(
    async (signal) => {
      try {
        return await lookupBarcode(code, signal);
      } catch (err) {
        if (signal.aborted) throw err;
        return null;
      }
    },
    [code],
    code.length >= 8
  );

  const off = lookup.data ?? null;
  const checked = code.length >= 8 && !lookup.loading && !lookup.error;
  const offMissed = checked && !off;
  const matches = useMemo(
    () => (checked ? matchRecalls(off, code, recalls) : null),
    [checked, off, code, recalls]
  );

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
    <div className="space-y-4">
      <p className="prose-measure text-sm text-ink-2">
        In the store? Type or paste a product's barcode number to see whether it's named in a
        current FDA or USDA FSIS recall. Open Food Facts identifies the product; the FDA/FSIS record
        is the source of truth.
      </p>

      <div>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="barcode" className="mb-1.5 block text-sm font-bold">
              Barcode number
            </label>
            <Input
              id="barcode"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 737628064502"
              maxLength={14}
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 14))}
              aria-invalid={inputError ? true : undefined}
              aria-describedby={inputError ? "barcode-error" : undefined}
              className="tnum min-w-[12rem] font-mono text-lg"
            />
          </div>
          <Button type="submit" variant="ink" className="min-h-12" disabled={lookup.loading}>
            {lookup.loading ? (
              <>
                <Loader2 className="animate-spin" /> Checking…
              </>
            ) : (
              <>
                <Search /> Check
              </>
            )}
          </Button>
        </form>
        {inputError && (
          <p id="barcode-error" className="mt-2 text-sm font-semibold text-[color:var(--status-critical)]">
            {inputError}
          </p>
        )}
      </div>

      {lookup.loading && <Loading className="h-20">Looking up the product…</Loading>}

      {checked && matches && (
        <div className="space-y-4">
          <BarcodeVerdict
            matches={matches}
            feedNote={feedNote}
            emphasizeNote={/meat|poultry|chicken|beef|pork|turkey|egg|sausage/i.test(`${off?.categories ?? ""} ${off?.name ?? ""}`)}
          />

          {/* Resolved product identity (or the raw code, if OFF had no record). */}
          <Sheet quiet className="flex items-center gap-4 p-4">
            {off?.imageUrl && (
              <img src={off.imageUrl} alt="" className="size-16 shrink-0 rounded-md border border-rule bg-paper object-contain" />
            )}
            <div className="min-w-0">
              {off ? (
                <>
                  <p className="truncate text-sm font-bold">{off.name ?? "Unnamed product"}</p>
                  {off.brands.length > 0 && <p className="truncate text-sm text-ink-2">{off.brands.join(", ")}</p>}
                  <p className="tnum mt-0.5 text-xs text-ink-2">
                    Barcode {code}{off.code !== code && ` (matched as ${off.code})`} · identified via Open Food Facts
                  </p>
                </>
              ) : (
                <>
                  <p className="tnum text-sm font-bold">Barcode {code}</p>
                  <p className="mt-0.5 text-sm text-ink-2">
                    Open Food Facts has no record for this code, so we matched recalls on the
                    number alone. You can still search recalls by brand or food name.
                  </p>
                </>
              )}
            </div>
          </Sheet>

          {/* Never dead-end: point back to the recall feed below to search by name. */}
          {(offMissed || (matches.exact.length === 0 && matches.possible.length === 0)) && (
            <div className="rounded-lg border-2 border-dashed border-rule p-4 text-sm">
              <p className="font-bold">Want to double-check by name?</p>
              <p className="mt-1 text-ink-2">
                Barcode coverage is uneven. Scroll down to the full recall feed and filter by
                agency or severity
                {brandHint ? (
                  <>
                    , or scan the list for <span className="font-bold text-ink">{off?.brands[0] ?? off?.name}</span>
                  </>
                ) : null}
                . You can also{" "}
                <Link className="link" to="/">
                  browse by food
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      )}

      <InfoNote>
        <p className="font-bold text-ink">How this works</p>
        <p className="mt-1">
          Open Food Facts turns the barcode into a product name and brand — it only identifies the
          item and is not a safety authority. We then check that identity, and the raw number,
          against the current FDA (openFDA food enforcement) and USDA FSIS recall records, which are
          the source of truth. This is not medical advice — always confirm against the official FDA and CDC sources.
        </p>
      </InfoNote>
    </div>
  );
}
