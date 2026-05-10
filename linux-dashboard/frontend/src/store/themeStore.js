import { create } from 'zustand'

const saved = localStorage.getItem('theme') || 'dark'
if (saved === 'light') document.documentElement.classList.add('light')

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
