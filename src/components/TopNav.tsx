import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { MapPin, Loader2, Moon, Sun, Menu, X } from "lucide-react";
import { useZipContext } from "@/hooks/ZipContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/Wordmark";

const LINKS = [
  { to: "/", label: "Foods", end: true },
  { to: "/outbreaks", label: "Outbreaks" },
  { to: "/recalls", label: "Recalls" },
  { to: "/shop-local", label: "Shop local" },
  { to: "/learn", label: "Learn" },
];

/** The thin band across the top of the map: wordmark, five places, your ZIP. */
export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  // The home front door carries its own ZIP field.
  const onHome = useLocation().pathname === "/";

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-ground/95 backdrop-blur-sm" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <nav className="container flex h-16 items-center gap-3">
        <Link to="/" className="shrink-0 rounded-md" aria-label="OpenCORE home">
          <Wordmark />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-1 pl-4 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="capsule capsule--sm capsule--ghost">
              {l.label}
              <span aria-hidden className="capsule__chip" />
            </NavLink>
          ))}
        </div>
        <div className="flex-1 md:hidden" />

        {!onHome && <NavZip />}
        <ThemeToggle className="hidden md:inline-flex" />

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="capsule capsule--sm min-h-11 px-3 md:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {menuOpen && (
        <>
          <button aria-hidden tabIndex={-1} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 cursor-default md:hidden" />
          <div id="mobile-nav" className="sheet relative z-40 mx-5 mb-3 flex flex-col gap-1 p-2 md:hidden">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMenuOpen(false)}
                className="capsule justify-between border-transparent"
              >
                {l.label}
                <span aria-hidden className="capsule__chip" />
              </NavLink>
            ))}
            <ThemeToggle className="justify-between border-transparent" withLabel onToggle={() => setMenuOpen(false)} />
          </div>
        </>
      )}
    </header>
  );
}

/** The ZIP capsule: sun fill, the place name beside it once it resolves. */
function NavZip() {
  const { zip, setZip, geo, geoLoading, geoError } = useZipContext();
  const place = geo ? `${geo.place}, ${geo.stateAbbr}` : "";
  return (
    <div className="relative flex shrink-0 items-center">
      <label
        htmlFor="nav-zip"
        className={cn("capsule capsule--sm cursor-text gap-1 pl-2.5 pr-1.5 sm:gap-1.5 sm:pl-3 sm:pr-2", geoError ? "capsule--coral" : "capsule--sun")}
      >
        <MapPin className="size-4" aria-hidden />
        <span className="sr-only">Your ZIP code</span>
        <input
          id="nav-zip"
          inputMode="numeric"
          maxLength={5}
          placeholder="ZIP"
          aria-invalid={geoError ? true : undefined}
          aria-describedby={geoError ? "nav-zip-note" : undefined}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          className="tnum w-[3.6rem] bg-transparent sm:w-[4.2rem] text-base font-bold text-on-fill placeholder:text-on-fill/70 focus:outline-none sm:text-sm"
          style={{ color: "var(--on-fill)" }}
        />
        {geoLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          place && <span className="hidden max-w-[7rem] truncate text-xs font-semibold lg:inline">{place}</span>
        )}
      </label>
      <div role="status" aria-live="polite" className="contents">
        {geoError && (
          <span id="nav-zip-note" className="sheet absolute right-0 top-full z-50 mt-2 max-w-[18rem] px-3 py-1.5 text-xs font-semibold">
            {geoError}
          </span>
        )}
      </div>
    </div>
  );
}

function ThemeToggle({
  className,
  withLabel = false,
  onToggle,
}: {
  className?: string;
  withLabel?: boolean;
  onToggle?: () => void;
}) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={() => {
        toggle();
        onToggle?.();
      }}
      aria-label={withLabel ? undefined : "Dark mode"}
      aria-pressed={dark}
      className={cn("capsule capsule--sm capsule--ghost min-h-11 px-3 [&[aria-pressed=true]]:flex-row", withLabel && "capsule--sm px-4", className)}
    >
      {withLabel && <span>{dark ? "Light mode" : "Dark mode"}</span>}
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
