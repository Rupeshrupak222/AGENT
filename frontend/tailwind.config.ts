import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#2563eb", // Linear/Stripe Precision Blue
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#1e3a8a",
          900: "#172554",
        },
        surface: {
          DEFAULT: "var(--bg)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
          sidebar: "var(--bg-sidebar)",
          muted: "var(--bg-muted)",
          hover: "var(--bg-hover)",
          active: "var(--bg-active)",
        },
        page: "var(--bg-page)",
        dropdown: "var(--bg-dropdown)",
        input: "var(--bg-input)",
        modal: "var(--bg-modal)",
        content: {
          DEFAULT: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        line: {
          DEFAULT: "var(--border-default)",
          muted: "var(--border-muted)",
          focus: "var(--border-focus)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        brand:      "0 1px 3px 0 rgba(37, 99, 235, 0.15), 0 1px 2px -1px rgba(37, 99, 235, 0.15)",
        "brand-sm": "0 1px 2px 0 rgba(37, 99, 235, 0.10)",
        glow:       "0 4px 20px -2px rgba(37, 99, 235, 0.25)",
        xs:         "var(--shadow-sm)",
        sm:         "var(--shadow-sm)",
        md:         "var(--shadow-md)",
        lg:         "var(--shadow-lg)",
        xl:         "var(--shadow-xl)",
        card:       "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)",
        glass:      "0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      },
      animation: {
        wave:       "wave 1.4s ease-in-out infinite",
        "fade-in":  "fadeIn 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "spin-slow":"spin 2s linear infinite",
      },
      keyframes: {
        wave: {
          "0%,100%": { transform: "scaleY(0.5)" },
          "50%":     { transform: "scaleY(1.8)" },
        },
        fadeIn:  { from:{ opacity:"0" },                        to:{ opacity:"1" } },
        scaleIn: { from:{ opacity:"0", transform:"scale(0.95)"},to:{ opacity:"1", transform:"scale(1)" } },
        slideUp: { from:{ opacity:"0", transform:"translateY(16px)" }, to:{ opacity:"1", transform:"translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
