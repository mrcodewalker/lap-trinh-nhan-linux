import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Activity, Cpu, ChevronRight, Menu, X, Zap } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const NAV = [
  {
    icon: Terminal,
    label: 'Shell & Automation',
    sub: 'Files · Cron · Packages',
    path: '/shell',
    color: '#22d3ee',
    glow: 'rgba(6,182,212,0.3)',
  },
  {
    icon: Activity,
    label: 'Process & Network',
    sub: 'Processes · Sockets · Net',
    path: '/process',
    color: '#a78bfa',
    glow: 'rgba(139,92,246,0.3)',
  },
  {
    icon: Cpu,
    label: 'Kernel Modules',
    sub: 'Modules · Build · Logs',
    path: '/kernel',
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.3)',
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex-shrink-0 h-screen flex flex-col overflow-hidden"
      style={{ background: 'rgba(6,10,26,0.95)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Top logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', boxShadow: '0 0 20px rgba(6,182,212,0.4)' }}>
          <Zap size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-sm font-bold text-white leading-none">LinuxDash</p>
              <p className="text-[10px] text-white/30 mt-0.5">System Control</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 4 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden"
                style={active ? {
                  background: `linear-gradient(135deg, ${item.color}18, ${item.color}08)`,
                  border: `1px solid ${item.color}30`,
                  boxShadow: `0 0 20px ${item.glow}`,
                } : {
                  border: '1px solid transparent',
                }}
              >
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={active
                    ? { background: `${item.color}20`, boxShadow: `0 0 12px ${item.glow}` }
                    : { background: 'rgba(255,255,255,0.04)' }
                  }>
                  <item.icon size={16} style={{ color: active ? item.color : 'rgba(255,255,255,0.4)' }} />
                </div>

                {/* Label */}
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-[13px] font-medium leading-none truncate"
                        style={{ color: active ? item.color : 'rgba(255,255,255,0.6)' }}>
                        {item.label}
                      </p>
                      <p className="text-[10px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {item.sub}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {active && !collapsed && (
                  <ChevronRight size={14} style={{ color: item.color, flexShrink: 0 }} />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {collapsed ? <Menu size={16} className="text-white/40" /> : <X size={16} className="text-white/40" />}
          {!collapsed && <span className="text-xs text-white/30">Collapse</span>}
        </motion.button>
      </div>
    </motion.aside>
  )
}
