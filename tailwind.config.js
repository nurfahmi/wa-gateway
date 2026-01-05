/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.ejs",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7ed',
          100: '#ccefdb',
          200: '#99dfb7',
          300: '#66cf93',
          400: '#33bf6f',
          500: '#25D366',
          600: '#1ea952',
          700: '#128C7E',
          800: '#0e6b5f',
          900: '#0a4a40',
        },
        whatsapp: {
          DEFAULT: '#25D366',
          dark: '#128C7E',
          light: '#DCF8C6',
          'dark-green': '#075E54',
          'light-green': '#DCF8C6',
        }
      }
    },
  },
  plugins: [],
}

