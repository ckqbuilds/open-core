import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ShieldCheck, MapPin, Loader2, Moon, Sun, Menu, X } from "lucide-react";
import { useZipContext } from "@/hooks/ZipContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Foods", end: true },
  { to: "/outbreaks", label: "Outbreaks" },
  { to: "/recalls", label: "Active recalls" },
  { to: "/shop-local", label: "Shop local" },
  { to: "/learn", label: "Learn" },
];

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className="sticky top-0 z-40 px-3 pt-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <nav className="mx-auto flex max-w-6xl items-center gap-2 rounded-xl border bg-card/80 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <Link to="/" className="flex shrink-0 items-center gap-1.5" aria-label="OpenCORE home">
          <ShieldCheck className="size-5 text-primary" />
          <span className="hidden text-sm font-semibold sm:inline">OpenCORE</span>
        </Link>

        {/* Desktop: inline links */}
        <div className="hidden min-w-0 flex-1 items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile: spacer pushes the right cluster over */}
        <div className="flex-1 sm:hidden" />

        <NavZip />
        <ThemeToggle />

        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
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
            className="fixed inset-0 z-30 cursor-default sm:hidden"
          />
          <div
            id="mobile-nav"
            className="relative z-40 mx-auto mt-2 max-w-6xl rounded-xl border bg-card p-2 shadow-lg sm:hidden"
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
    "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isActive
      ? "bg-secondary text-foreground"
      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
  );
}

function NavZip() {
  const { zip, setZip, geo, geoLoading } = useZipContext();
  return (
    <div
      className="relative shrink-0"
      title={geo ? `${geo.place}, ${geo.stateAbbr}` : "Enter your ZIP"}
    >
      <MapPin className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        inputMode="numeric"
        maxLength={5}
        placeholder="ZIP"
        aria-label="Your ZIP code"
        value={zip}
        onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
        className="h-8 w-20 rounded-md border border-input bg-background pl-7 pr-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-24"
      />
      {geoLoading && (
        <Loader2 className="absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
