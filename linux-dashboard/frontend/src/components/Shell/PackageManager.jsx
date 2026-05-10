import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, Download, Trash2, RefreshCw, Search } from 'lucide-react'
import api from '../../utils/api'

export default function PackageManager() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [installing, setInstalling] = useState(null)

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/packages/list')
      setPackages(response.data.packages)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async (pkg) => {
    setInstalling(pkg)
    try {
      await api.post('/packages/install', { package: pkg })
      loadPackages()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to install package')
    } finally {
      setInstalling(null)
    }
  }

  const handleRemove = async (pkg) => {
    if (!window.confirm(`Remove ${pkg}?`)) return

    setInstalling(pkg)
    try {
      await api.post('/packages/remove', { package: pkg })
      loadPackages()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove package')
    } finally {
      setInstalling(null)
    }
  }

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h3 className="text-lg font-bold text-cyber-cyan">Package Manager</h3>
            <p className="text-sm text-cyber-cyan/60">{packages.length} packages installed</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={loadPackages}
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
            placeholder="Search packages..."
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

      {/* Packages */}
      <div className="glass rounded-lg border border-cyber-cyan/20 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-cyber-cyan/60">Loading packages...</div>
        ) : filteredPackages.length === 0 ? (
          <div className="p-8 text-center text-cyber-cyan/60">No packages found</div>
        ) : (
          <div className="divide-y divide-cyber-cyan/10 max-h-96 overflow-y-auto">
            {filteredPackages.map((pkg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-smooth"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Package size={18} className="text-cyber-purple" />
                  <div className="flex-1">
                    <p className="font-mono text-sm">{pkg.name}</p>
                    <p className="text-xs text-cyber-cyan/60">{pkg.version}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleRemove(pkg.name)}
                    disabled={installing === pkg.name}
                    className="p-2 rounded-lg hover:glass transition-smooth disabled:opacity-50"
                  >
                    <Trash2 size={16} className="text-neon-pink/60" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
