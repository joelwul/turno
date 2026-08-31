import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#F6F5F7', 100: '#ECEAEF', 200: '#D8D5DD', 300: '#B9B4C0', 400: '#948D9D',
          500: '#767080', 600: '#5D5766', 700: '#4A4551', 800: '#35313B', 900: '#26232B', 950: '#1B1920',
        },
        primary: {
          50: '#F8F3F7', 100: '#F0E4EE', 200: '#E0CBDD', 300: '#CBAAC6', 400: '#B489AD',
          500: '#A2719C', 600: '#8A5B84', 700: '#71496C', 800: '#593A55', 900: '#463044', 950: '#2E1F2D',
          DEFAULT: '#8A5B84',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(38 35 43 / 0.05), 0 8px 24px -12px rgb(38 35 43 / 0.12)',
        lift: '0 2px 4px rgb(38 35 43 / 0.06), 0 16px 40px -16px rgb(38 35 43 / 0.2)',
      },
    },
  },
  plugins: [],
} satisfies Config;