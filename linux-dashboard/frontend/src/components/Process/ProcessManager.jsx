import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Trash2, Search } from 'lucide-react'
import api from '../../utils/api'

export default function ProcessManager() {
  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadProcesses()
    const interval = setInterval(loadProcesses, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadProcesses = async () => {
    try {
      const response = await api.get('/process/list')
      setProcesses(response.data.processes)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load processes')
    }
  }

  const handleKill = async (pid) => {
    if (!window.confirm(`Kill process ${pid}?`)) return

    try {
      await api.post('/process/kill', { pid, signal: 'SIGTERM' })
      loadProcesses()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to kill process')
    }
  }

  const filteredProcesses = processes.filter(p =>
    p.command.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="glass rounded-lg border border-cyber-cyan/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-cyber-cyan">Process Manager</h3>
            <p className="text-sm text-cyber-cyan/60">{processes.length} processes running</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={loadProcesses}
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
            placeholder="Search processes..."
            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-cyber-cyan/30 rounded-lg focus:border-cyber-cyan focus:outline-none transition-smooth text-white placeholder-cyber-cyan/30"
          />
        </div>
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

      {/* Processes Table */}
      <div className="glass rounded-lg border border-cyber-cyan/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-cyber-cyan/20 bg-black/30">
              <tr>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">PID</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">User</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">CPU %</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">MEM %</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">Command</th>
                <th className="px-4 py-3 text-center text-cyber-cyan/60">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-cyan/10">
              {filteredProcesses.slice(0, 20).map((proc, idx) => (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/5 transition-smooth"
                >
                  <td className="px-4 py-3 font-mono text-neon-green">{proc.pid}</td>
                  <td className="px-4 py-3 text-cyber-cyan/80">{proc.user}</td>
                  <td className="px-4 py-3 text-cyber-purple">{proc.cpu}</td>
                  <td className="px-4 py-3 text-cyber-purple">{proc.mem}</td>
                  <td className="px-4 py-3 text-cyber-cyan/80 truncate">{proc.command}</td>
                  <td className="px-4 py-3 text-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleKill(proc.pid)}
                      className="p-1 rounded hover:glass transition-smooth"
                    >
                      <Trash2 size={14} className="text-neon-pink/60" />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
