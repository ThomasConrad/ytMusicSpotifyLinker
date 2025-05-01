/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nord: {
          // Polar Night
          'polar-night-1': '#2E3440',
          'polar-night-2': '#3B4252',
          'polar-night-3': '#434C5E',
          'polar-night-4': '#4C566A',
          // Snow Storm
          'snow-storm-1': '#D8DEE9',
          'snow-storm-2': '#E5E9F0',
          'snow-storm-3': '#ECEFF4',
          // Frost
          'frost-1': '#8FBCBB',
          'frost-2': '#88C0D0',
          'frost-3': '#81A1C1',
          'frost-4': '#5E81AC',
          // Aurora
          'aurora-red': '#BF616A',
          'aurora-orange': '#D08770',
          'aurora-yellow': '#EBCB8B',
          'aurora-green': '#A3BE8C',
          'aurora-purple': '#B48EAD',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
} 