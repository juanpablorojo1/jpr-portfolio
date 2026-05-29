import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#080808",
        surface: "#1C1C1C",
        "surface-alt": "#262626",
        accent: "#E8272A",
        "accent-dark": "#8B1517",
        "off-white": "#E8E4DE",
        muted: "#666666",
        border: "#2A2A2A",
      },
      fontFamily: {
        display: ["var(--font-bebas-neue)", "Arial Narrow", "sans-serif"],
        ui: ["var(--font-barlow-condensed)", "Barlow", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "Fira Code", "monospace"],
      },
      fontSize: {
        "hero": ["6rem", { lineHeight: "1.0", letterSpacing: "0.02em" }],
        "hero-sm": ["4rem", { lineHeight: "1.0", letterSpacing: "0.02em" }],
        "h1": ["4rem", { lineHeight: "1.05" }],
        "h2": ["3rem", { lineHeight: "1.05" }],
        "h3": ["1.75rem", { lineHeight: "1.2" }],
        "h4": ["1.25rem", { lineHeight: "1.3" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7" }],
        "metric": ["3rem", { lineHeight: "1.0", letterSpacing: "-0.02em" }],
        "code": ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0.05em" }],
      },
      borderRadius: {
        none: "0px",
        xs: "2px",
        sm: "4px",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0, 0, 0, 0.6)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.8), 0 0 24px rgba(232, 39, 42, 0.15)",
        "accent-glow": "0 0 16px rgba(232, 39, 42, 0.4), 0 0 48px rgba(232, 39, 42, 0.15)",
        "text-glow": "0 0 20px rgba(232, 39, 42, 0.6)",
        "btn-hover": "0 0 16px rgba(232, 39, 42, 0.20)",
      },
      spacing: {
        "section": "6rem",
        "section-sm": "4rem",
      },
    },
  },
  plugins: [],
};

export default config;
