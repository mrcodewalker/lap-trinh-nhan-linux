import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search } from 'lucide-react'
import api from '../../utils/api'

export default function KernelLogs() {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadLogs()
    const interval = setInterval(loadLogs, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadLogs = async () => {
    try {
      const response = await api.get('/kernel/dmesg', { params: { lines: 100 } })
      setLogs(response.data.messages)
    } catch (err) {
      console.error('Failed to load kernel logs')
    }
  }

  const filteredLogs = logs
    .split('\n')
    .filter(line => line.toLowerCase().includes(searchQuery.toLowerCase()))
    .join('\n')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="glass rounded-lg border border-cyber-cyan/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-cyber-cyan">Kernel Messages (dmesg)</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={loadLogs}
            className="p-2 rounded-lg hover:glass transition-smooth"
          >
            <RefreshCw size={18} className="text-cyber-cyan" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-cyber-cyan/50" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter logs..."
            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-cyber-cyan/30 rounded-lg focus:border-cyber-cyan focus:outline-none transition-smooth text-white placeholder-cyber-cyan/30"
          />
        </div>
      </div>

      {/* Logs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-lg border border-cyber-cyan/20 p-4"
      >
        <pre className="font-mono text-xs text-neon-green overflow-auto max-h-96 whitespace-pre-wrap break-words">
          {filteredLogs || 'No logs available'}
        </pre>
      </motion.div>
    </motion.div>
  )
}
