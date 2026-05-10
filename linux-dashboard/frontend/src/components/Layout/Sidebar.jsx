import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, X, Terminal, Zap, Cpu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const location = useLocation()

  const menuItems = [
    { icon: Terminal, label: 'Shell & Automation', path: '/shell', color: 'cyber-cyan' },
    { icon: Zap, label: 'Process & Network', path: '/process', color: 'cyber-purple' },
    { icon: Cpu, label: 'Kernel Modules', path: '/kernel', color: 'neon-pink' }
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg glass"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 h-screen w-64 glass-dark border-r border-cyber-cyan/20 z-40 lg:static lg:translate-x-0 overflow-y-auto"
      >
        <div className="p-6">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold gradient-text">LINUX</h1>
            <p className="text-xs text-cyber-cyan/60 mt-1">System Dashboard</p>
            <p className="text-xs text-neon-green mt-2">v2.0 - No Auth</p>
          </div>

          {/* Menu */}
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 5 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth ${
                    isActive(item.path)
                      ? 'glass bg-white/10 border-l-2 border-cyber-cyan'
                      : 'hover:glass'
                  }`}
                >
                  <item.icon size={18} className={`text-${item.color}`} />
                  <span className="text-sm">{item.label}</span>
                </motion.div>
              </Link>
            ))}
          </nav>

          {/* Info */}
          <div className="mt-8 p-4 glass rounded-lg border border-cyber-cyan/20">
            <p className="text-xs text-cyber-cyan/60 mb-2">System Access</p>
            <p className="text-xs text-neon-green">Direct Command Execution</p>
            <p className="text-xs text-cyber-purple mt-2">Real-time Streaming</p>
          </div>
        </div>
      </motion.aside>

      {/* Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}
    </>
  )
}
