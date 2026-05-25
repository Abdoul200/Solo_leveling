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
        "sl-black": "#0a0a0f",
        "sl-dark": "#0f0f1a",
        "sl-darker": "#070710",
        "sl-blue": "#00d4ff",
        "sl-blue-dim": "#0090aa",
        "sl-purple": "#8b5cf6",
        "sl-violet": "#6d28d9",
        "sl-violet-dim": "#4c1d95",
        "sl-gold": "#f59e0b",
        "sl-gold-dim": "#d97706",
        "sl-red": "#ef4444",
        "sl-green": "#10b981",
        "sl-text": "#e2e8f0",
        "sl-text-muted": "#94a3b8",
        "sl-border": "rgba(0, 212, 255, 0.15)",
        "sl-border-purple": "rgba(139, 92, 246, 0.2)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Inter", "sans-serif"],
      },
      boxShadow: {
        "glow-blue": "0 0 20px rgba(0, 212, 255, 0.5)",
        "glow-blue-lg": "0 0 40px rgba(0, 212, 255, 0.4), 0 0 80px rgba(0, 212, 255, 0.2)",
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.5)",
        "glow-purple-lg": "0 0 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(139, 92, 246, 0.2)",
        "glow-gold": "0 0 20px rgba(245, 158, 11, 0.5)",
        "glow-red": "0 0 20px rgba(239, 68, 68, 0.5)",
        "card": "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "gradient-sl": "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a1f 100%)",
        "gradient-blue-purple": "linear-gradient(135deg, #00d4ff, #8b5cf6)",
        "gradient-purple-blue": "linear-gradient(135deg, #8b5cf6, #00d4ff)",
        "gradient-gold": "linear-gradient(135deg, #f59e0b, #fbbf24)",
        "gradient-fire": "linear-gradient(135deg, #ef4444, #f97316)",
        "gradient-card": "linear-gradient(135deg, rgba(15, 15, 26, 0.9) 0%, rgba(10, 10, 20, 0.95) 100%)",
        "gradient-card-purple": "linear-gradient(135deg, rgba(15, 15, 26, 0.9) 0%, rgba(15, 10, 30, 0.95) 100%)",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "glow-pulse-purple": "glow-pulse-purple 2s ease-in-out infinite",
        "glow-pulse-gold": "glow-pulse-gold 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "level-up-flash": "level-up-flash 0.8s ease-out forwards",
        "system-alert": "system-alert 4s ease-in-out forwards",
        "shimmer": "shimmer 2s infinite",
        "rotate-aura": "rotate-aura 8s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "text-glow": "text-glow 2s ease-in-out infinite",
        "flicker": "flicker 3s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
        "dungeon-appear": "dungeon-appear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(0, 212, 255, 0.3), 0 0 20px rgba(0, 212, 255, 0.1)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.3)" },
        },
        "glow-pulse-purple": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(139, 92, 246, 0.3), 0 0 20px rgba(139, 92, 246, 0.1)" },
          "50%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.3)" },
        },
        "glow-pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.1)" },
          "50%": { boxShadow: "0 0 20px rgba(245, 158, 11, 0.6), 0 0 40px rgba(245, 158, 11, 0.3)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)", opacity: "0.7" },
          "33%": { transform: "translateY(-15px) rotate(120deg)", opacity: "1" },
          "66%": { transform: "translateY(-8px) rotate(240deg)", opacity: "0.8" },
        },
        "level-up-flash": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "20%": { opacity: "1", transform: "scale(1.1)" },
          "40%": { opacity: "0.8", transform: "scale(0.95)" },
          "60%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "system-alert": {
          "0%": { opacity: "0", transform: "translateY(-30px) scale(0.9)" },
          "15%": { opacity: "1", transform: "translateY(5px) scale(1.02)" },
          "35%": { transform: "translateY(0px) scale(1)" },
          "85%": { opacity: "1", transform: "translateY(0px) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-20px) scale(0.95)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "rotate-aura": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.1)", opacity: "0.4" },
          "100%": { transform: "scale(1.2)", opacity: "0" },
        },
        "text-glow": {
          "0%, 100%": { textShadow: "0 0 10px rgba(0, 212, 255, 0.5)" },
          "50%": { textShadow: "0 0 20px rgba(0, 212, 255, 0.9), 0 0 40px rgba(0, 212, 255, 0.5)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "scan-line": {
          "0%": { top: "-10%" },
          "100%": { top: "110%" },
        },
        "dungeon-appear": {
          "0%": { opacity: "0", transform: "scale(0.3) rotate(-10deg)" },
          "50%": { opacity: "1", transform: "scale(1.05) rotate(2deg)" },
          "75%": { transform: "scale(0.98) rotate(-1deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
      },
      borderRadius: {
        "sl": "12px",
        "sl-lg": "16px",
      },
      backdropBlur: {
        "sl": "12px",
      },
    },
  },
  plugins: [],
};

export default config;
