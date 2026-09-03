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
          50:  "#fef2f2",
          100: "#fde2e3",
          200: "#fcc9cb",
          300: "#f5edee",
          400: "#f46d72",
          500: "#D42027",
          600: "#bb1920",
          700: "#9b1219",
          800: "#811115",
          900: "#6d1214",
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
        brand:      "0 0 40px rgba(212,32,39,0.40)",
        "brand-sm": "0 0 20px rgba(212,32,39,0.28)",
        glow:       "0 0 60px rgba(212,32,39,0.55)",
        xs:         "var(--shadow-sm)",
        sm:         "var(--shadow-sm)",
        md:         "var(--shadow-md)",
        lg:         "var(--shadow-lg)",
        xl:         "var(--shadow-xl)",
        glass:      "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
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
