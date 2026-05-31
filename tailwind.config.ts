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
        muted: "#CBD5E1",
        soft: "#94A3B8",
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
      fontFamily: {
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
