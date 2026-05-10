import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, X, Download, ChevronDown } from 'lucide-react'
import api from '../../utils/api'

const LINE_COLORS = {
  error:   'text-red-400',
  warn:    'text-yellow-400',
  info:    'text-cyan-400/80',
  default: 'text-white/60',
}

const colorLine = (line) => {
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('fail') || l.includes('bug')) return LINE_COLORS.error
  if (l.includes('warn') || l.includes('warning')) return LINE_COLORS.warn
  if (l.includes('info') || l.includes('loaded') || l.includes('success')) return LINE_COLORS.info
  return LINE_COLORS.default
}

export default function KernelLogs() {
  const [logs, setLogs]       = useState('')
  const [filter, setFilter]   = useState('')
  const [lines, setLines]     = useState(100)
  const [loading, setLoading] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [lines])

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/kernel/dmesg', { params: { lines } })
      setLogs(r.data.messages || '')
    } catch (e) { console.error('Failed to load kernel logs') }
    finally { setLoading(false) }
  }

  const download = () => {
    const blob = new Blob([logs], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'dmesg.log'; a.click()
    URL.revokeObjectURL(url)
  }

  const filteredLines = logs.split('\n').filter(l =>
    !filter || l.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter logs..." className="input pl-9" />
        </div>
        <div className="flex items-center gap-1.5">
          {[50, 100, 200, 500].map(n => (
            <button key={n} onClick={() => setLines(n)}
              className={`btn-ghost py-1.5 px-3 text-xs ${lines === n ? 'text-cyan-400 border-cyan-500/30' : ''}`}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={() => setAutoScroll(!autoScroll)}
          className={`btn-ghost py-1.5 px-3 text-xs flex items-center gap-1 ${autoScroll ? 'text-cyan-400 border-cyan-500/30' : ''}`}>
          <ChevronDown size={12} /> Auto
        </button>
        <button onClick={download} className="btn-ghost p-2" data-tooltip="Download">
          <Download size={13} />
        </button>
        <button onClick={load} className="btn-ghost p-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs text-white/30">{filteredLines.length} lines</span>
      </div>

      {/* Log viewer */}
      <div className="card overflow-hidden">
        <div className="terminal-header">
          <span className="terminal-dot bg-red-400/60" />
          <span className="terminal-dot bg-yellow-400/60" />
          <span className="terminal-dot bg-green-400/60" />
          <span className="text-xs text-white/30 ml-2 font-mono">dmesg</span>
          {loading && <RefreshCw size={11} className="ml-auto text-white/30 animate-spin" />}
        </div>
        <div className="max-h-[500px] overflow-y-auto p-4 font-mono text-xs space-y-0.5">
          {filteredLines.length === 0 ? (
            <p className="text-white/30 text-center py-8">No logs available</p>
          ) : (
            filteredLines.map((line, i) => (
              <div key={i} className={`leading-relaxed ${colorLine(line)}`}>
                {line}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
