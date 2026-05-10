import { useState } from 'react'
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
    glow: 'rgba(6,182,212,0.25)',
  },
  {
    icon: Activity,
    label: 'Process & Network',
    sub: 'Processes · Sockets · Net',
    path: '/process',
    color: '#a78bfa',
    glow: 'rgba(139,92,246,0.25)',
  },
  {
    icon: Cpu,
    label: 'Kernel Modules',
    sub: 'Modules · Build · Logs',
    path: '/kernel',
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.25)',
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 236 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="relative flex-shrink-0 h-screen flex flex-col overflow-hidden sidebar-bg"
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: '1px solid var(--border2)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
            boxShadow: '0 0 20px rgba(6,182,212,0.35)',
          }}
        >
          <Zap size={18} className="text-white" />
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-sm font-bold leading-none" style={{ color: 'var(--text)' }}>
                LinuxDash
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
                System Control
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 3 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden"
                style={active ? {
                  background: `linear-gradient(135deg, ${item.color}18, ${item.color}08)`,
                  border: `1px solid ${item.color}30`,
                  boxShadow: `0 0 16px ${item.glow}`,
                } : {
                  border: '1px solid transparent',
                }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={active
                    ? { background: `${item.color}20`, boxShadow: `0 0 10px ${item.glow}` }
                    : { background: 'var(--card-bg)' }
                  }
                >
                  <item.icon
                    size={16}
                    style={{ color: active ? item.color : 'var(--text3)' }}
                  />
                </div>

                {/* Label */}
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="flex-1 min-w-0"
                    >
                      <p
                        className="text-[13px] font-medium leading-none truncate"
                        style={{ color: active ? item.color : 'var(--text2)' }}
                      >
                        {item.label}
                      </p>
                      <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text3)' }}>
                        {item.sub}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {active && !collapsed && (
                  <ChevronRight size={13} style={{ color: item.color, flexShrink: 0 }} />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-4">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setCollapsed(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          {collapsed
            ? <Menu size={15} style={{ color: 'var(--text3)' }} />
            : <X    size={15} style={{ color: 'var(--text3)' }} />
          }
          {!collapsed && (
            <span className="text-xs" style={{ color: 'var(--text3)' }}>Collapse</span>
          )}
        </motion.button>
      </div>
    </motion.aside>
  )
}
