import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00ffd4",
        accent: "#36f1fe",
        indigo: "#6366f1",
        magenta: "#a855f7",
        warning: "#ff6b6b",
        night: {
          DEFAULT: "#050b1f",
          700: "#0a122d",
          800: "#101a3b",
          900: "#04071d",
        },
      },
      backgroundImage: {
        "body-gradient":
          "linear-gradient(135deg, #0f0f23 0%, #1a1a3a 50%, #0f0f23 100%)",
        "panel-gradient":
          "linear-gradient(135deg, rgba(99,102,241,0.16) 0%, rgba(6,182,212,0.12) 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(6,182,212,0.08) 100%)",
        "badge-gradient": "linear-gradient(45deg, #6366f1, #06b6d4)",
        "night-grid":
          "linear-gradient(rgba(0,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.08) 1px, transparent 1px)",
      },
      boxShadow: {
        glow: "0 0 35px rgba(15, 244, 255, 0.35)",
        panel: "0 25px 70px rgba(6, 25, 66, 0.55)",
        card: "0 18px 45px rgba(8, 30, 75, 0.45)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        gridFloat: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(-25px,-25px,0)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "grid-float": "gridFloat 20s ease-in-out infinite",
        "glow-pulse": "glowPulse 4s ease-in-out infinite",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;
