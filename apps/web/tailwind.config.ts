import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#faf2e8",
        card: "#fff9f1",
        ink: "#17243f",
        line: "#dfcebb",
        journey: "#2967df",
        action: "#f98f2f",
        muted: "#657597",
        success: "#587424",
        warning: "#c0560c"
      },
      boxShadow: {
        panel: "0 20px 45px rgba(27, 57, 118, 0.10), 0 4px 10px rgba(27, 57, 118, 0.06)",
        action: "0 10px 26px rgba(249, 143, 47, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
