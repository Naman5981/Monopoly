/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'system-ui', 'sans-serif'],
        rounded: ['Rubik', 'Fredoka', 'system-ui', 'sans-serif'],
        display: ['Rubik', 'Fredoka', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
