/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      // The app's legacy utility names (bg-card, text-muted-foreground, bg-primary,
      // border, …) now resolve to HeroUI v3's oklch semantic tokens, so the whole
      // app and every HeroUI component share ONE theme. Recolor everything by
      // overriding the --* tokens in index.css, not here.
      colors: {
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--focus)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        secondary: {
          DEFAULT: "var(--default)",
          foreground: "var(--default-foreground)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "var(--danger-foreground)",
        },
        muted: {
          DEFAULT: "var(--background-secondary)",
          foreground: "var(--muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--surface-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
