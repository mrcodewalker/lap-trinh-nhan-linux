import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Clock, Sun, Moon } from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'
import { useThemeStore } from '../../store/themeStore'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/shell':   { title: 'Shell & Automation',  sub: 'File management · Cron · Packages · System time' },
  '/process': { title: 'Process & Network',   sub: 'Processes · Resources · Sockets · Network tools' },
  '/kernel':  { title: 'Kernel Modules',      sub: 'Module management · Build · Kernel logs' },
}

export default function Header() {
  const { connected } = useSocketStore()
  const { theme, toggle } = useThemeStore()
  const [time, setTime] = useState(new Date())
  const location = useLocation()
  const page = PAGE_TITLES[location.pathname] || PAGE_TITLES['/shell']

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-6 py-3 header-bg"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      {/* Left — page title */}
      <div>
        <h1 className="text-base font-bold leading-none" style={{ color: 'var(--text)' }}>
          {page.title}
        </h1>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{page.sub}</p>
      </div>

      {/* Right — status bar */}
      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="flex items-center gap-1.5">
          <Clock size={13} style={{ color: 'var(--text3)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--text2)' }}>
            {time.toLocaleTimeString()}
          </span>
        </div>

        {/* Connection dot */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs" style={{ color: '#34d399' }}>Live</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-red-400/60" />
              <span className="text-xs text-red-400/70">Offline</span>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggle}
          className="p-2 rounded-lg transition-all duration-200"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun size={15} style={{ color: '#fbbf24' }} />
            : <Moon size={15} style={{ color: '#7c3aed' }} />
          }
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative p-2 rounded-lg transition-all duration-200"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <Bell size={15} style={{ color: 'var(--text3)' }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        </motion.button>
      </div>
    </header>
  )
}
