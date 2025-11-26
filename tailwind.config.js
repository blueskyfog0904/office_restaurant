/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#1B365D', // Main Navy
          600: '#162c4b',
          700: '#10223a',
          800: '#0b1728',
          900: '#050c17',
        },
        secondary: {
          50: '#fffaf0',
          100: '#feebc8',
          200: '#fbd38d',
          300: '#f6ad55',
          400: '#ed8936',
          500: '#d69e2e', // Gold/Amber Accent
          600: '#b7791f',
          700: '#975a16',
          800: '#744210',
          900: '#422006',
        },
        accent: {
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}

