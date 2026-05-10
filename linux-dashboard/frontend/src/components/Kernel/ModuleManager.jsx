import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Trash2, Upload, Play } from 'lucide-react'
import api from '../../utils/api'

export default function ModuleManager() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadModules()
    const interval = setInterval(loadModules, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadModules = async () => {
    try {
      const response = await api.get('/kernel/modules')
      setModules(response.data.modules)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load modules')
    }
  }

  const handleUnload = async (moduleName) => {
    if (!window.confirm(`Unload module ${moduleName}?`)) return

    try {
      await api.post('/kernel/rmmod', { module: moduleName })
      loadModules()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unload module')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="glass rounded-lg border border-cyber-cyan/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-cyber-cyan">Loaded Modules</h3>
            <p className="text-sm text-cyber-cyan/60">{modules.length} modules loaded</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={loadModules}
            className="p-2 rounded-lg hover:glass transition-smooth"
          >
            <RefreshCw size={18} className="text-cyber-cyan" />
          </motion.button>
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

      {/* Modules Table */}
      <div className="glass rounded-lg border border-cyber-cyan/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-cyber-cyan/20 bg-black/30">
              <tr>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">Module Name</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">Size</th>
                <th className="px-4 py-3 text-left text-cyber-cyan/60">Used By</th>
                <th className="px-4 py-3 text-center text-cyber-cyan/60">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-cyan/10">
              {modules.slice(0, 20).map((mod, idx) => (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/5 transition-smooth"
                >
                  <td className="px-4 py-3 font-mono text-neon-green">{mod.name}</td>
                  <td className="px-4 py-3 text-cyber-cyan/80">{mod.size}</td>
                  <td className="px-4 py-3 text-cyber-cyan/80 text-xs">{mod.usedBy}</td>
                  <td className="px-4 py-3 text-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleUnload(mod.name)}
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
