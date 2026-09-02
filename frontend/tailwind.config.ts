import type { Config } from "tailwindcss";

// Primary brand: #D42027  (crimson red from image)
const RED = {
  50:  "#fef2f2",
  100: "#fde2e3",
  200: "#fcc9cb",
  300: "#f5edee",
  400: "#f46d72",
  500: "#D42027",   // ← exact brand color
  600: "#bb1920",
  700: "#9b1219",
  800: "#811115",
  900: "#6d1214",
  950: "#edeaea",
};

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
        brand: RED,
        primary: RED,
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":  "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        brand:      "0 0 40px rgba(212,32,39,0.40)",
        "brand-sm": "0 0 20px rgba(212,32,39,0.28)",
        glow:       "0 0 60px rgba(212,32,39,0.55)",
        glass:      "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-sm": "0 4px 16px rgba(0,0,0,0.40)",
      },
      animation: {
        wave:       "wave 1.4s ease-in-out infinite",
        "fade-in":  "fadeIn 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
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
