/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-dark': '#0a0e27',
        'cyber-navy': '#1a1f3a',
        'cyber-purple': '#9d4edd',
        'cyber-cyan': '#00f5ff',
        'cyber-blue': '#3a86ff',
        'neon-pink': '#ff006e',
        'neon-green': '#00ff41',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        'xl': '20px',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 245, 255, 0.5)',
        'neon-purple': '0 0 20px rgba(157, 78, 221, 0.5)',
        'neon-pink': '0 0 20px rgba(255, 0, 110, 0.5)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
