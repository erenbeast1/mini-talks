/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lego-red': '#C91A09',
        'lego-blue': '#0055BF',
        'lego-yellow': '#FFD500',
        'lego-green': '#00852B',
      },
    },
  },
  plugins: [],
}