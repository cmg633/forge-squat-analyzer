/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'acid-lime': '#CCFF00',
        'signal-yellow': '#F5FF00',
        'hot-magenta': '#F040B8',
        violet: '#A97BFF',
        ink: '#0A0A0A',
        paper: '#F4F4EE',
        hairline: 'rgba(255, 255, 255, 0.12)',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        pixel: ['Silkscreen', 'monospace'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Archivo', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        eyebrow: '0.14em',
      },
      borderRadius: {
        none: '0px',
      },
    },
  },
  plugins: [],
};
