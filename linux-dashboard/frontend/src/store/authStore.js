import { create } from 'zustand'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      set({ user, token, loading: false })
      return true
    } catch (err) {
      set({ error: err.response?.data?.error || 'Login failed', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  }
}))
