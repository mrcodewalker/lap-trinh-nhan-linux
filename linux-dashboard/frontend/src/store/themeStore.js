import { create } from 'zustand'

// Default is LIGHT mode
const saved = localStorage.getItem('theme') || 'light'
// Apply immediately before React renders
if (saved === 'light') {
  document.documentElement.classList.add('light')
} else {
  document.documentElement.classList.remove('light')
}

export const useThemeStore = create((set) => ({
  theme: saved,
  toggle: () => {
    set(state => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      document.documentElement.classList.toggle('light', next === 'light')
      return { theme: next }
    })
  },
}))
