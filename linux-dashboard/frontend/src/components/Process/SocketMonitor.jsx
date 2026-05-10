import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search } from 'lucide-react'
import api from '../../utils/api'

export default function SocketMonitor() {
  const [connections, setConnections] = useState([])
  const [ports, setPorts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('connections')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [connRes, portsRes] = await Promise.all([
        api.get('/network/connections'),
        api.get('/network/ports')
      ])
      setConnections(connRes.data.connections)
    } catch (err) {
      console.error('Failed to load socket data')
    }
  }

  const filteredConnections = connections.filter(c =>
    c.localAddr.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h3 className="text-lg font-bold text-cyber-cyan">Socket Monitor</h3>
            <p className="text-sm text-cyber-cyan/60">{connections.length} connections</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={loadData}
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
            placeholder="Search connections..."
            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-cyber-cyan/30 rounded-lg focus:border-cyber-cyan focus:outline-none transition-smooth text-white placeholder-cyber-cyan/30"
          />
        </div>
      </div>

      {/* Connections Table */}
      <div className="glass rounded-lg border border-cyber-cyan/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-cyber-cyan/20 bg-black/30">
              <tr>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">Protocol</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">Local Address</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">Peer Address</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-cyan/10">
              {filteredConnections.slice(0, 15).map((conn, idx) => (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/5 transition-smooth"
                >
                  <td className="px-4 py-3 font-mono text-neon-green">{conn.proto}</td>
                  <td className="px-4 py-3 text-cyber-cyan/80 font-mono text-xs">{conn.localAddr}</td>
                  <td className="px-4 py-3 text-cyber-cyan/80 font-mono text-xs">{conn.peerAddr}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${
                      conn.state === 'LISTEN' ? 'bg-neon-green/20 text-neon-green' : 'bg-cyber-cyan/20 text-cyber-cyan'
                    }`}>
                      {conn.state}
                    </span>
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
