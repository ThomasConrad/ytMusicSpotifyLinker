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
      animation: {
        'slide-down': 'slideDown 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-slow': 'fadeIn 1s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'zoom-in': 'zoomIn 0.5s ease-out',
        'zoom-out': 'zoomOut 0.5s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'flip': 'flip 1s ease-in-out',
        'rotate-center': 'rotateCenter 1s ease-in-out',
        'shadow-pulse': 'shadowPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        zoomOut: {
          '0%': { transform: 'scale(1.05)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        flip: {
          '0%': { transform: 'perspective(400px) rotateY(0)' },
          '100%': { transform: 'perspective(400px) rotateY(360deg)' },
        },
        rotateCenter: {
          '0%': { transform: 'rotate(0)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shadowPulse: {
          '0%, 100%': { 
            'box-shadow': '0 0 0 0 rgba(14, 165, 233, 0.7)',
          },
          '50%': { 
            'box-shadow': '0 0 0 15px rgba(14, 165, 233, 0)',
          },
        },
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [],
} 