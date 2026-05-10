import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../utils/api'

export default function ResourceMonitor() {
  const [systemInfo, setSystemInfo] = useState(null)
  const [memoryData, setMemoryData] = useState([])
  const [diskData, setDiskData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSystemInfo()
    const interval = setInterval(loadSystemInfo, 2000)
    return () => clearInterval(interval)
  }, [])

  const loadSystemInfo = async () => {
    try {
      const [sysRes, memRes, diskRes] = await Promise.all([
        api.get('/system/info'),
        api.get('/system/memory'),
        api.get('/system/disk')
      ])

      setSystemInfo(sysRes.data)
      setMemoryData(prev => [...prev.slice(-19), {
        time: new Date().toLocaleTimeString(),
        used: memRes.data.used / (1024 * 1024 * 1024),
        total: memRes.data.total / (1024 * 1024 * 1024)
      }])
      setDiskData(diskRes.data.disks)
    } catch (err) {
      console.error('Failed to load system info')
    }
  }

  if (!systemInfo) {
    return <div className="text-center text-cyber-cyan/60">Loading...</div>
  }

  const memUsagePercent = ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory * 100).toFixed(1)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* System Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-lg border border-cyber-cyan/20 p-4"
        >
          <p className="text-xs text-cyber-cyan/60 mb-2">CPU Cores</p>
          <p className="text-2xl font-bold text-neon-green">{systemInfo.cpus}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-lg border border-cyber-cyan/20 p-4"
        >
          <p className="text-xs text-cyber-cyan/60 mb-2">Memory Usage</p>
          <p className="text-2xl font-bold text-cyber-purple">{memUsagePercent}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-lg border border-cyber-cyan/20 p-4"
        >
          <p className="text-xs text-cyber-cyan/60 mb-2">Uptime</p>
          <p className="text-2xl font-bold text-cyber-cyan">{(systemInfo.uptime / 3600).toFixed(1)}h</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-lg border border-cyber-cyan/20 p-4"
        >
          <p className="text-xs text-cyber-cyan/60 mb-2">Load Average</p>
          <p className="text-2xl font-bold text-neon-pink">{systemInfo.loadAverage[0].toFixed(2)}</p>
        </motion.div>
      </div>

      {/* Memory Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-lg border border-cyber-cyan/20 p-4"
      >
        <h3 className="text-lg font-bold text-cyber-cyan mb-4">Memory Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={memoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 245, 255, 0.1)" />
            <XAxis dataKey="time" stroke="rgba(0, 245, 255, 0.5)" />
            <YAxis stroke="rgba(0, 245, 255, 0.5)" />
            <Tooltip contentStyle={{ backgroundColor: '#0a0e27', border: '1px solid rgba(0, 245, 255, 0.3)' }} />
            <Line type="monotone" dataKey="used" stroke="#00f5ff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Disk Usage */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-lg border border-cyber-cyan/20 p-4"
      >
        <h3 className="text-lg font-bold text-cyber-cyan mb-4">Disk Usage</h3>
        <div className="space-y-3">
          {diskData.map((disk, idx) => (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-cyber-cyan/80">{disk.filesystem}</span>
                <span className="text-sm text-neon-green">{disk.percentage}</span>
              </div>
              <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: disk.percentage }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-purple"
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
