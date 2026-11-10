/** @type {import('tailwindcss').Config} */
export default {
  content: {
    relative: true,
    files: [
      './index.html',
      './index.template.html',
      './src/**/*.{js,ts,html}',
      './src/templates/**/*.html'
    ]
  },
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
