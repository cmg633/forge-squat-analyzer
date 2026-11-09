/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0B0B0B',
          surface: '#111111',
          card: '#161616',
          border: '#222222',
          red: '#E03A1E',
          'red-dark': '#B02E18',
          'red-glow': 'rgba(224,58,30,0.15)',
          white: '#FFFFFF',
          grey: '#888888',
          'grey-light': '#AAAAAA',
          green: '#22C55E',
          'green-glow': 'rgba(34,197,94,0.15)',
        },
      },
      fontFamily: {
        display: ['Barlow Condensed', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        eyebrow: '0.2em',
      },
      boxShadow: {
        'red-glow': '0 0 20px rgba(224,58,30,0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        'glass': '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

