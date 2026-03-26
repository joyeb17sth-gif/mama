/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // "Ultra-modern" Palette
        background: '#FBFBFB',
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1', // Indigo 500
          600: '#4F46E5', // Indigo 600 - Main Brand Color
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        zinc: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7', // Border color
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A', // Secondary text
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B', // Primary text
        }
      },
      borderRadius: {
        'lg': '0.75rem', // 12px
        'xl': '1rem',    // 16px
        '2xl': '1.5rem', // 24px
      },
      fontSize: {
        'h1': '24px',
        'h2': '22px',
        'p1': '18px',
        'p2': '16px',
        'p3': '14px',
      },
      letterSpacing: {
        tight: '-0.025em',
        tighter: '-0.04em',
      }
    },
  },
  plugins: [],
}
