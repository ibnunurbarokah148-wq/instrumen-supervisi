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
      fontFamily: {
        sans: ["var(--font-nunito)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "var(--font-nunito)", "sans-serif"],
      },
      colors: {
        sora: {
          50: "#f0f8ff",
          100: "#e0f1fe",
          200: "#bae3fd",
          300: "#7dcefb",
          400: "#38b5f7",
          500: "#0e9ce8",
          600: "#027cc6",
          700: "#0363a1",
          800: "#075485",
          900: "#0c466e",
        },
        sakura: {
          50: "#fff1f5",
          100: "#ffe4ec",
          200: "#fecddde",
          300: "#fda4c2",
          400: "#fb71a1",
          500: "#f43f80",
          600: "#e11d67",
          700: "#be1253",
        },
      },
      boxShadow: {
        pastel: "0 10px 30px -5px rgba(14, 156, 232, 0.12), 0 4px 12px -2px rgba(244, 63, 128, 0.06)",
        card: "0 4px 20px -2px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
