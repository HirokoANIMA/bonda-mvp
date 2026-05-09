/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Warm cream palette derived from logo background (~#f0ece6)
        warm: {
          50:  '#faf8f5',
          100: '#f5f1ec',
          200: '#f0ece6',
          300: '#e8e2da',
          400: '#ddd5cb',
          500: '#c8bcaf',
          600: '#a8907e',
        },
        // Sage palette centered on #A8B8A0 — used as ambient accent only
        sage: {
          50:  '#f4f7f3',   // near-invisible tint, background blends
          100: '#e8f0e6',   // very soft wash
          200: '#d2e4cf',   // gentle tint, signal bars low
          300: '#b8ccb4',   // mid presence
          400: '#a8b8a0',   // the core hue — #A8B8A0
          500: '#8fa687',   // slightly deeper for text hints
          600: '#718068',   // muted label, verified numbers
          700: '#5a6654',   // deeper, rare use
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        sageGlow: 'sageGlow 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sageGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      paddingBottom: {
        safe: 'max(env(safe-area-inset-bottom), 0.5rem)',
      },
    },
  },
  plugins: [],
};
