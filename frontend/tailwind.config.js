/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#070d0a',  // Deep botanical peat / rich forest obsidian
          900: '#0e1813',  // Dark spruce loam
          850: '#13211a',  // Elevated pine panel
          800: '#1b3024',  // Moss-patina border
          700: '#284635',  // Focus / highlight border
          600: '#3a614b',  // Subtle outline
          500: '#548166',  // Muted sage text
          400: '#8ba898',  // Secondary lichen text
          300: '#b4ccbf',  // Soft foliage mist
          200: '#d7e6de',  // Light stone
          100: '#f0f6f2',  // Crisp organic parchment
        },
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
    },
  },
  plugins: [],
}
