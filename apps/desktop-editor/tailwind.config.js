/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#07080B",
        surface: {
          DEFAULT: "#0F1117",
          subtle: "#161922",
          border: "#232736",
          hover: "#2A2F42",
        },
        brand: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          accent: "#EC4899",
          emerald: "#10B981",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
