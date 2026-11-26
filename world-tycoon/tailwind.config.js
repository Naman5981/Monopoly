/** @type {import('tailwindcss').Config} */
export default {
  content: {
    relative: true,
    files: [
      './index.html',
      './index.template.html',
      './src/**/*.{js,ts,html,svelte}',
      './src/templates/**/*.html'
    ]
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        rounded: ['Fredoka', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      }
    }
  },
  plugins: [],
}
