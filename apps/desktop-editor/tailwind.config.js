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
        // Pure black & calibrated obsidian/charcoal shades for pro video editor
        background: "#050505",
        surface: {
          DEFAULT: "#0B0B0C", // Level 2: Primary panels & headers
          subtle: "#121214",  // Level 3: Cards, sub-panels & track headers
          card: "#161619",    // Level 4: Interactive elements & cards
          border: "#202025",  // Level 5: Hairline dividers & boundaries
          hover: "#26262E",   // Level 6: Elevated hover states
          active: "#30303A",  // Level 7: Active / selected states
        },
        editor: {
          void: "#000000",       // Level 0: Pure pitch black for canvas & video letterboxing
          canvas: "#050505",     // Level 1: App frame & main window backplate
          panel: "#0B0B0D",      // Level 2: Top header, sidebar containers, timeline frame
          subpanel: "#111114",   // Level 3: Tab switchers, track lane headers, modal headers
          card: "#16161A",       // Level 4: Preset cards, asset tiles, search inputs
          hover: "#222228",      // Level 5: Button hover, card hover
          border: "#1F1F24",     // Subtle hairline borders
          borderStrong: "#2A2A32", // Focused / active borders
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
