import { create } from 'zustand'
import io from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  activeUsers: 0,

  connect: (token) => {
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      set({ connected: true })
      console.log('Socket connected')
    })

    socket.on('disconnect', () => {
      set({ connected: false })
      console.log('Socket disconnected')
    })

    socket.on('sessions:update', (data) => {
      set({ activeUsers: data.activeCount })
    })

    set({ socket })
    return socket
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
  },

  emit: (event, data) => {
    const { socket } = get()
    if (socket) {
      socket.emit(event, data)
    }
  },

  on: (event, callback) => {
    const { socket } = get()
    if (socket) {
      socket.on(event, callback)
    }
  },

  off: (event) => {
    const { socket } = get()
    if (socket) {
      socket.off(event)
    }
  }
}))
