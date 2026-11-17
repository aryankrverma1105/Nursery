/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Public brand tokens (Forest & Earth palette)
        brand: {
          50: '#f2f8f4',
          100: '#e1efe5',
          200: '#c5e0cd',
          300: '#9ac9a8',
          400: '#69ab7e',
          500: '#468f5c',
          600: '#347348',
          700: '#2a5b3a',
          800: '#244930',
          900: '#1e3c28',
          950: '#0e2015',
        },
        earth: {
          50: '#fbf9f6',
          100: '#f5f0e8',
          200: '#ebdfce',
          300: '#ddc9ad',
          400: '#caa885',
          500: '#ba8c64',
          600: '#a77653',
          700: '#8b5e43',
          800: '#714d3a',
          900: '#5e4033',
        },
        // Private app high-contrast utility tokens
        ops: {
          green: {
            light: '#15803d',
            bg: '#dcfce7',
            darkBg: '#052e16',
            darkText: '#4ade80'
          },
          amber: {
            light: '#b45309',
            bg: '#fef3c7',
            darkBg: '#451a03',
            darkText: '#fcd34d'
          },
          red: {
            light: '#b91c1c',
            bg: '#fee2e2',
            darkBg: '#450a0a',
            darkText: '#f87171'
          },
          surface: {
            light: '#ffffff',
            dark: '#121a14',
            darkAlt: '#1a261e',
            darkBorder: '#273c2e'
          }
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      minHeight: {
        'touch': '48px',
      },
      minWidth: {
        'touch': '48px',
      }
    },
  },
  plugins: [],
}

