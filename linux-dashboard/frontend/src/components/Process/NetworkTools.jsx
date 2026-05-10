import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, RefreshCw } from 'lucide-react'
import api from '../../utils/api'

export default function NetworkTools() {
  const [activeTab, setActiveTab] = useState('ping')
  const [host, setHost] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePing = async () => {
    if (!host.trim()) return
    setLoading(true)
    setResult('')
    try {
      const response = await api.post('/network/ping', { host, count: 4 })
      setResult(response.data.result)
    } catch (err) {
      setResult(`Error: ${err.response?.data?.error || 'Failed to ping'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTraceroute = async () => {
    if (!host.trim()) return
    setLoading(true)
    setResult('')
    try {
      const response = await api.post('/network/traceroute', { host })
      setResult(response.data.result)
    } catch (err) {
      setResult(`Error: ${err.response?.data?.error || 'Failed to traceroute'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDNS = async () => {
    if (!host.trim()) return
    setLoading(true)
    setResult('')
    try {
      const response = await api.post('/network/dns', { host })
      setResult(response.data.result)
    } catch (err) {
      setResult(`Error: ${err.response?.data?.error || 'Failed to lookup'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Tabs */}
      <div className="flex gap-2 glass rounded-lg border border-cyber-cyan/20 p-2">
        {['ping', 'traceroute', 'dns'].map(tab => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded transition-smooth capitalize ${
              activeTab === tab
                ? 'bg-cyber-cyan/20 text-cyber-cyan'
                : 'text-cyber-cyan/60 hover:text-cyber-cyan'
            }`}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      {/* Input */}
      <div className="glass rounded-lg border border-cyber-cyan/20 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (
              activeTab === 'ping' ? handlePing() :
              activeTab === 'traceroute' ? handleTraceroute() :
              handleDNS()
            )}
            placeholder={`Enter ${activeTab} target...`}
            className="flex-1 px-4 py-2 bg-black/30 border border-cyber-cyan/30 rounded-lg focus:border-cyber-cyan focus:outline-none transition-smooth text-white placeholder-cyber-cyan/30"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => {
              if (activeTab === 'ping') handlePing()
              else if (activeTab === 'traceroute') handleTraceroute()
              else handleDNS()
            }}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyber-cyan to-cyber-purple text-black font-semibold transition-smooth disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={16} />
            Execute
          </motion.button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-lg border border-cyber-cyan/20 p-4"
        >
          <pre className="font-mono text-sm text-neon-green overflow-auto max-h-96 whitespace-pre-wrap break-words">
            {result}
          </pre>
        </motion.div>
      )}
    </motion.div>
  )
}
