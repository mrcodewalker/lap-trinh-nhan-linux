/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Map to CSS variables so they work in both dark/light
        'theme-bg':     'var(--bg)',
        'theme-text':   'var(--text)',
        'theme-border': 'var(--border)',
        'theme-accent': 'var(--accent)',
      },
    },
  },
  plugins: [],
}
