import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0F172A",
        panel: "#111C32",
        "panel-2": "#17233A",
        "panel-3": "#1D2A44",
        line: "#2A3852",
        text: "#F8FAFC",
        muted: "#9CA3AF",
        soft: "#D1D5DB",
        indigo: "#6366F1",
        cyan: "#22D3EE",
        success: "#34D399",
        warning: "#FBBF24",
        danger: "#FB7185"
      },
      borderRadius: {
        DEFAULT: "8px"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0,0,0,.28)"
      },
      keyframes: {
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" }
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" }
        }
      },
      animation: {
        "collapsible-down": "collapsible-down 200ms ease-out",
        "collapsible-up": "collapsible-up 200ms ease-out"
      },
      fontFamily: {
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
