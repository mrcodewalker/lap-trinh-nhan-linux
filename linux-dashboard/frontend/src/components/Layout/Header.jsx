import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Clock, Wifi, WifiOff } from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'

export default function Header() {
  const { connected, activeUsers } = useSocketStore()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="sticky top-0 z-30 glass border-b border-cyber-cyan/20 backdrop-blur-xl">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full border-2 border-transparent border-t-cyber-cyan border-r-cyber-purple"
          />
          <div>
            <h2 className="text-lg font-bold gradient-text">Linux Dashboard</h2>
            <p className="text-xs text-cyber-cyan/60">Real-time System Monitor</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">
          {/* Time */}
          <div className="flex items-center gap-2 text-sm font-mono">
            <Clock size={16} className="text-cyber-cyan" />
            <span className="text-neon-green">{time.toLocaleTimeString()}</span>
          </div>

          {/* Connection status */}
          <motion.div
            animate={{ opacity: connected ? 1 : 0.5 }}
            className="flex items-center gap-2"
          >
            {connected ? (
              <>
                <Wifi size={16} className="text-neon-green animate-pulse" />
                <span className="text-xs text-neon-green">{activeUsers} online</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-neon-pink" />
                <span className="text-xs text-neon-pink">Offline</span>
              </>
            )}
          </motion.div>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            className="relative p-2 rounded-lg hover:glass transition-smooth"
          >
            <Bell size={18} className="text-cyber-cyan" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-neon-pink rounded-full animate-pulse" />
          </motion.button>
        </div>
      </div>
    </header>
  )
}
