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
        notion: {
          black: 'rgba(0, 0, 0, 0.95)',
          blue: '#0075de',
          'blue-active': '#005bab',
          'link-blue': '#0075de',
          'focus-blue': '#097fe8',
          'badge-blue-bg': '#f2f9ff',
          'badge-blue-text': '#097fe8',
          'warm-white': '#f6f5f4',
          'warm-dark': '#31302e',
          'warm-gray': {
            500: '#615d59',
            300: '#a39e98',
          },
          teal: '#2a9d99',
          green: '#1aae39',
          orange: '#dd5b00',
          pink: '#ff64c8',
          purple: '#391c57',
          brown: '#523410',
        },
        // Legacy colors kept for compatibility during migration
        background: '#ffffff',
        primary: {
          50: '#f2f9ff',
          500: '#0075de',
          600: '#0075de',
          700: '#005bab',
        }
      },
      boxShadow: {
        'notion-card': 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.84688px, rgba(0,0,0,0.02) 0px 0.8px 2.925px, rgba(0,0,0,0.01) 0px 0.175px 1.04062px',
        'notion-deep': 'rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.02) 0px 7px 15px, rgba(0,0,0,0.04) 0px 14px 28px, rgba(0,0,0,0.05) 0px 23px 52px',
      },
      borderRadius: {
        'micro': '4px',
        'subtle': '5px',
        'standard': '8px',
        'comfortable': '12px',
        'large': '16px',
        'pill': '9999px',
      },
      fontSize: {
        'display-hero': ['64px', { lineHeight: '1.00', letterSpacing: '-2.125px', fontWeight: '700' }],
        'display-secondary': ['54px', { lineHeight: '1.04', letterSpacing: '-1.875px', fontWeight: '700' }],
        'section-heading': ['48px', { lineHeight: '1.00', letterSpacing: '-1.50px', fontWeight: '700' }],
        'sub-heading-large': ['40px', { lineHeight: '1.50', fontWeight: '700' }],
        'sub-heading': ['26px', { lineHeight: '1.23', letterSpacing: '-0.625px', fontWeight: '700' }],
        'card-title': ['22px', { lineHeight: '1.27', letterSpacing: '-0.25px', fontWeight: '700' }],
        'body-large': ['20px', { lineHeight: '1.40', letterSpacing: '-0.125px', fontWeight: '600' }],
        'body-medium': ['16px', { lineHeight: '1.50', fontWeight: '500' }],
        'body-semibold': ['16px', { lineHeight: '1.50', fontWeight: '600' }],
        'nav-button': ['15px', { lineHeight: '1.33', fontWeight: '600' }],
        'caption': ['14px', { lineHeight: '1.43', fontWeight: '500' }],
        'badge': ['12px', { lineHeight: '1.33', fontWeight: '600', letterSpacing: '0.125px' }],
      },
      letterSpacing: {
        'notion-display': '-2.125px',
        'notion-section': '-1.5px',
        'notion-card': '-0.25px',
      }
    },
  },
  plugins: [],
}
