import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Wifi, WifiOff, Clock, Activity } from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/shell':   { title: 'Shell & Automation', sub: 'File management · Cron · Packages · System time' },
  '/process': { title: 'Process & Network',  sub: 'Processes · Resources · Sockets · Network tools' },
  '/kernel':  { title: 'Kernel Modules',     sub: 'Module management · Build · Kernel logs' },
}

export default function Header() {
  const { connected, activeUsers } = useSocketStore()
  const [time, setTime] = useState(new Date())
  const location = useLocation()
  const page = PAGE_TITLES[location.pathname] || PAGE_TITLES['/shell']

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-6 py-3"
      style={{ background: 'rgba(6,10,26,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>

      {/* Left - page title */}
      <div>
        <h1 className="text-base font-bold text-white leading-none">{page.title}</h1>
        <p className="text-[11px] text-white/30 mt-0.5">{page.sub}</p>
      </div>

      {/* Right - status */}
      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-white/30" />
          <span className="text-xs font-mono text-white/50">{time.toLocaleTimeString()}</span>
        </div>

        {/* Connection */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs text-emerald-400/70">Live</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-red-400/60" />
              <span className="text-xs text-red-400/70">Offline</span>
            </>
          )}
        </div>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative p-2 rounded-lg transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Bell size={15} className="text-white/40" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        </motion.button>
      </div>
    </header>
  )
}
