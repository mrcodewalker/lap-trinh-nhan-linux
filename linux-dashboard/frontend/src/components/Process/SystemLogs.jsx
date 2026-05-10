import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, Download, ChevronDown, X } from 'lucide-react'
import api from '../../utils/api'

const LOG_SOURCES = [
  { id: 'journalctl', label: 'Journal',   endpoint: '/process/logs/journalctl' },
  { id: 'kernel',     label: 'Kernel',    endpoint: '/process/logs/kernel' },
  { id: 'auth',       label: 'Auth',      endpoint: '/process/logs/auth' },
]

const lineColor = (line) => {
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('fail') || l.includes('critical')) return 'text-red-400'
  if (l.includes('warn'))   return 'text-yellow-400'
  if (l.includes('info') || l.includes('started') || l.includes('success')) return 'text-cyan-400/80'
  if (l.includes('debug'))  return 'text-white/35'
  return 'text-white/55'
}

export default function SystemLogs() {
  const [source, setSource]   = useState('journalctl')
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
  }, [source, lines])

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const load = async () => {
    setLoading(true)
    try {
      const src = LOG_SOURCES.find(s => s.id === source)
      const r = await api.get(src.endpoint, { params: { lines } })
      setLogs(r.data.logs || r.data.messages || '')
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const download = () => {
    const blob = new Blob([logs], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${source}.log`; a.click()
    URL.revokeObjectURL(url)
  }

  const filteredLines = logs.split('\n').filter(l =>
    !filter || l.toLowerCase().includes(filter.toLowerCase())
  )

  const errorCount  = filteredLines.filter(l => l.toLowerCase().includes('error')).length
  const warnCount   = filteredLines.filter(l => l.toLowerCase().includes('warn')).length

  return (
    <div className="space-y-3">
      {/* Source + stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="card p-2 flex items-center gap-1">
          {LOG_SOURCES.map(s => (
            <button key={s.id} onClick={() => { setSource(s.id); setLogs('') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                source === s.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/3'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {errorCount > 0 && (
            <span className="badge badge-red">{errorCount} errors</span>
          )}
          {warnCount > 0 && (
            <span className="badge badge-yellow">{warnCount} warnings</span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter logs..." className="input pl-9 py-2" />
        </div>
        {filter && (
          <button onClick={() => setFilter('')} className="btn-ghost p-2">
            <X size={13} />
          </button>
        )}
        <div className="flex items-center gap-1">
          {[50, 100, 200, 500].map(n => (
            <button key={n} onClick={() => setLines(n)}
              className={`btn-ghost py-1.5 px-2.5 text-xs ${lines === n ? 'text-cyan-400 border-cyan-500/30' : ''}`}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={() => setAutoScroll(v => !v)}
          className={`btn-ghost py-1.5 px-3 text-xs flex items-center gap-1 ${autoScroll ? 'text-cyan-400 border-cyan-500/30' : ''}`}>
          <ChevronDown size={12} /> Auto
        </button>
        <button onClick={download} className="btn-ghost p-2" title="Download">
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
          <span className="text-xs text-white/30 ml-2 font-mono">{source}</span>
          {loading && <RefreshCw size={11} className="ml-auto text-white/30 animate-spin" />}
        </div>
        <div className="max-h-[520px] overflow-y-auto p-4 font-mono text-xs space-y-px">
          {filteredLines.length === 0 ? (
            <p className="text-white/30 text-center py-8">No logs available</p>
          ) : (
            filteredLines.map((line, i) => (
              <div key={i} className={`leading-relaxed hover:bg-white/3 px-1 rounded transition-colors ${lineColor(line)}`}>
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
