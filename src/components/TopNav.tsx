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
  { to: "/recalls", label: "Active recalls" },
  { to: "/shop-local", label: "Shop local" },
  { to: "/learn", label: "Learn" },
];

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  // The home front door carries its own ZIP field.
  const onHome = useLocation().pathname === "/";

  // Close on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background/90 px-3 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <nav className="mx-auto flex h-[3.75rem] max-w-6xl items-center gap-2">
        <Link
          to="/"
          className="shrink-0 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="OpenCORE home"
        >
          <Wordmark />
        </Link>

        {/* Desktop: inline links */}
        <div className="hidden min-w-0 flex-1 items-stretch gap-1 self-stretch md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile: spacer pushes the right cluster over */}
        <div className="flex-1 md:hidden" />

        {!onHome && <NavZip />}
        <ThemeToggle />

        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile: dropdown menu */}
      {menuOpen && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 cursor-default md:hidden"
          />
          <div
            id="mobile-nav"
            className="relative z-40 mx-auto mt-2 max-w-6xl rounded-xl border bg-card p-2 shadow-lg md:hidden"
          >
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </>
      )}
    </header>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "-mb-px inline-flex shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isActive
      ? "border-accent text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground"
  );
}

function NavZip() {
  const { zip, setZip, geo, geoLoading, geoError } = useZipContext();
  const place = geo ? `${geo.place}, ${geo.stateAbbr}` : "";
  return (
    <div className="relative flex shrink-0 items-center gap-1.5">
      <label htmlFor="nav-zip" className="hidden text-xs font-medium text-muted-foreground md:inline">
        ZIP
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          id="nav-zip"
          inputMode="numeric"
          maxLength={5}
          placeholder="ZIP"
          aria-label="Your ZIP code"
          aria-invalid={geoError ? true : undefined}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          className={cn(
            "h-8 w-28 rounded-md border bg-background pl-7 pr-6 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-24 sm:text-sm",
            geoError ? "border-destructive" : "border-input"
          )}
        />
        {geoLoading && (
          <Loader2 className="absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {place && (
        <span className="hidden max-w-[8rem] truncate text-xs text-muted-foreground lg:inline" title={place}>
          {place}
        </span>
      )}
      <div role="status" aria-live="polite" className="contents">
        {geoError && (
          <span className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-md border border-destructive/40 bg-card px-2 py-1 text-xs text-[color:var(--status-critical)] shadow-md">
            {geoError}
          </span>
        )}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Dark mode"
      aria-pressed={theme === "dark"}
      className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
