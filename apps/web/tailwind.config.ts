import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trading Terminal Design System
        vt: {
          bg: "#070b12",
          surface: "#101826",
          "surface-warm": "#162238",
          fg: "#f8fafc",
          "fg-2": "#cbd5e1",
          muted: "#8492a6",
          meta: "#38bdf8",
          border: "#263246",
          "border-soft": "#1c2638",
          accent: "#38bdf8",
          "accent-on": "#03111a",
          success: "#22c55e",
          warn: "#f59e0b",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "PingFang SC", "Microsoft YaHei", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "SF Mono", "ui-monospace", "Menlo", "monospace"],
      },
      fontSize: {
        "text-xs": "11px",
        "text-sm": "12px",
        "text-base": "14px",
        "text-lg": "16px",
        "text-xl": "20px",
        "text-2xl": "28px",
        "text-3xl": "40px",
        "text-4xl": "56px",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "12px",
        pill: "9999px",
      },
      boxShadow: {
        raised: "0 24px 80px rgba(0, 0, 0, 0.42)",
        ring: "0 0 0 1px var(--vt-border)",
      },
      maxWidth: {
        container: "1320px",
      },
      spacing: {
        section: "80px",
      },
    },
  },
  plugins: [],
};
export default config;
