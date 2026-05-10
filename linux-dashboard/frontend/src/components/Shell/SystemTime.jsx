import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, RefreshCw } from 'lucide-react'
import api from '../../utils/api'

export default function SystemTime() {
  const [time, setTime] = useState(new Date())
  const [timezone, setTimezone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTimeInfo()
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadTimeInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/system/timezone')
      setTimezone(response.data.timezone)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load timezone')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Main Clock */}
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="glass rounded-lg border border-cyber-cyan/20 p-8 text-center"
      >
        <div className="mb-4">
          <Clock size={32} className="mx-auto text-cyber-cyan mb-4" />
          <motion.div
            animate={{ textShadow: ['0 0 10px rgba(0, 245, 255, 0.5)', '0 0 20px rgba(157, 78, 221, 0.5)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl font-mono font-bold text-neon-green mb-2"
          >
            {formatTime(time)}
          </motion.div>
          <p className="text-2xl text-cyber-cyan mb-4">{formatDate(time)}</p>
        </div>

        {/* Timezone */}
        <div className="border-t border-cyber-cyan/20 pt-4">
          <p className="text-sm text-cyber-cyan/60 mb-2">Timezone</p>
          <p className="font-mono text-lg text-cyber-purple">{timezone || 'Loading...'}</p>
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-lg border border-cyber-cyan/20 p-4"
        >
          <p className="text-xs text-cyber-cyan/60 mb-2">Unix Timestamp</p>
          <p className="font-mono text-sm text-neon-green">{Math.floor(time.getTime() / 1000)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-lg border border-cyber-cyan/20 p-4"
        >
          <p className="text-xs text-cyber-cyan/60 mb-2">ISO 8601</p>
          <p className="font-mono text-sm text-neon-green">{time.toISOString()}</p>
        </motion.div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30 text-neon-pink text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Refresh Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={loadTimeInfo}
        disabled={loading}
        className="w-full py-2 rounded-lg border border-cyber-cyan/30 text-cyber-cyan hover:glass transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <RefreshCw size={16} />
        Refresh
      </motion.button>
    </motion.div>
  )
}
