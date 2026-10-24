/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1240px" },
    },
    extend: {
      // Guide Map world: flat colour, no grain. Every name resolves to a --token in
      // index.css; recolour there, never here. Legacy aliases (card, primary,
      // muted-foreground, destructive) are kept so no call site needs a rename.
      colors: {
        ground: "var(--ground)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        land: "var(--land)",
        "land-deep": "var(--land-deep)",
        coral: "var(--coral)",
        sun: "var(--sun)",
        pond: "var(--pond)",
        "pond-ink": "var(--pond-ink)",
        lilac: "var(--lilac)",
        paper: "var(--paper)",
        rule: "var(--rule)",
        border: "var(--rule)",
        input: "var(--ink)",
        ring: "var(--pond)",
        background: "var(--ground)",
        foreground: "var(--ink)",
        primary: { DEFAULT: "var(--ink)", foreground: "var(--ground)" },
        secondary: { DEFAULT: "var(--paper)", foreground: "var(--ink)" },
        destructive: { DEFAULT: "var(--coral)", foreground: "var(--ink)" },
        muted: { DEFAULT: "var(--paper)", foreground: "var(--ink-2)" },
        accent: { DEFAULT: "var(--land)", foreground: "var(--ink)" },
        card: { DEFAULT: "var(--paper)", foreground: "var(--ink)" },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
        pill: "999px",
      },
      fontFamily: {
        sans: ['"Schibsted Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      transitionTimingFunction: {
        over: "cubic-bezier(.34,1.56,.64,1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
