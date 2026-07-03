/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7', // Sky Blue
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          900: '#202124',
          800: '#3c4043',
          700: '#5f6368',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      }
    },
  },
  plugins: [],
}
