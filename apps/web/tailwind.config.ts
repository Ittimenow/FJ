import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f6f7f2",
        ink: "#171717",
        line: "#dedfd8",
        success: "#166534",
        warning: "#b45309"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(23, 23, 23, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
