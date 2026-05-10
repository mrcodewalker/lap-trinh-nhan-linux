import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, Download, ChevronDown, X } from 'lucide-react'
import api from '../../utils/api'

const LOG_SOURCES = [
  { id: 'journalctl', label: 'Journal', endpoint: '/process/logs/journalctl' },
  { id: 'kernel',     label: 'Kernel',  endpoint: '/process/logs/kernel' },
  { id: 'auth',       label: 'Auth',    endpoint: '/process/logs/auth' },
]

const lineColor = (line) => {
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('fail') || l.includes('critical')) return 'var(--red)'
  if (l.includes('warn'))    return 'var(--yellow)'
  if (l.includes('info') || l.includes('started') || l.includes('success')) return 'var(--accent)'
  if (l.includes('debug'))   return 'var(--text3)'
  return 'var(--text2)'
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

  const errorCount = filteredLines.filter(l => l.toLowerCase().includes('error')).length
  const warnCount  = filteredLines.filter(l => l.toLowerCase().includes('warn')).length

  return (
    <div className="space-y-3">
      {/* Source tabs + stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="card p-1.5 flex items-center gap-1">
          {LOG_SOURCES.map(s => (
            <button key={s.id} onClick={() => { setSource(s.id); setLogs('') }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={source === s.id ? {
                background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
                color: '#fff',
              } : {
                color: 'var(--text3)',
              }}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {errorCount > 0 && <span className="badge badge-red">{errorCount} errors</span>}
          {warnCount  > 0 && <span className="badge badge-yellow">{warnCount} warnings</span>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter logs..." className="input pl-9 py-2" />
        </div>
        {filter && (
          <button onClick={() => setFilter('')} className="btn-ghost p-2"><X size={13} /></button>
        )}
        <div className="flex items-center gap-1">
          {[50, 100, 200, 500].map(n => (
            <button key={n} onClick={() => setLines(n)}
              className="btn-ghost py-1.5 px-2.5 text-xs"
              style={lines === n ? { color: 'var(--accent)', borderColor: 'rgba(34,211,238,0.3)' } : {}}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={() => setAutoScroll(v => !v)}
          className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1"
          style={autoScroll ? { color: 'var(--accent)', borderColor: 'rgba(34,211,238,0.3)' } : {}}>
          <ChevronDown size={12} /> Auto
        </button>
        <button onClick={download} className="btn-ghost p-2" title="Download">
          <Download size={13} />
        </button>
        <button onClick={load} className="btn-ghost p-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs" style={{ color: 'var(--text3)' }}>{filteredLines.length} lines</span>
      </div>

      {/* Log viewer */}
      <div className="card overflow-hidden">
        <div className="terminal-header">
          <span className="terminal-dot bg-red-400/60" />
          <span className="terminal-dot bg-yellow-400/60" />
          <span className="terminal-dot bg-green-400/60" />
          <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>{source}</span>
          {loading && <RefreshCw size={11} className="ml-auto animate-spin" style={{ color: 'var(--text3)' }} />}
        </div>
        <div className="max-h-[520px] overflow-y-auto p-4 mono text-xs space-y-px"
          style={{ background: 'var(--code-bg)' }}>
          {filteredLines.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text3)' }}>No logs available</p>
          ) : (
            filteredLines.map((line, i) => (
              <div key={i} className="leading-relaxed px-1 rounded"
                style={{ color: lineColor(line) }}>
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
