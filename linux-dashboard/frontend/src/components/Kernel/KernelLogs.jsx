import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Search, X, Download, ChevronDown, Play, Square } from 'lucide-react'
import api from '../../utils/api'
import { useSocketStore } from '../../store/socketStore'

const lineColor = (line) => {
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('fail') || l.includes('bug')) return 'var(--red)'
  if (l.includes('warn') || l.includes('warning'))                     return 'var(--yellow)'
  if (l.includes('info') || l.includes('loaded') || l.includes('success')) return 'var(--accent)'
  return 'var(--text2)'
}

export default function KernelLogs() {
  const { socket, on, off, emit } = useSocketStore()
  const [logs, setLogs]             = useState([]) // Array of lines for easier management
  const [filter, setFilter]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [isWatching, setIsWatching] = useState(false)
  const bottomRef = useRef(null)

  // Initial load of last N lines
  useEffect(() => {
    load()
  }, [])

  // Socket listener for realtime logs
  useEffect(() => {
    if (!socket) return

    const onLine = (data) => {
      setLogs(prev => [...prev.slice(-999), data.line])
    }

    on('kernel:dmesg:line', onLine)
    return () => {
      off('kernel:dmesg:line')
    }
  }, [socket])

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/kernel/dmesg', { params: { lines: 200 } })
      const messages = r.data.messages || ''
      setLogs(messages.split('\n').filter(l => l.trim()))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const toggleWatch = () => {
    if (isWatching) {
      emit('kernel:dmesg:stop')
      setIsWatching(false)
    } else {
      emit('kernel:dmesg:watch')
      setIsWatching(true)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const download = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'dmesg.log'; a.click()
    URL.revokeObjectURL(url)
  }

  const filteredLines = logs.filter(l =>
    !filter || l.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-2 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter logs..." className="input pl-9 py-2" />
        </div>

        <button onClick={toggleWatch}
          className={`btn-ghost py-1.5 px-3 text-xs flex items-center gap-2 ${isWatching ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}`}
          style={isWatching ? { color: 'var(--green)', borderColor: 'rgba(52,211,153,0.3)' } : {}}>
          {isWatching ? <Square size={12} /> : <Play size={12} />}
          {isWatching ? 'Stop Realtime' : 'Start Realtime'}
        </button>

        <button onClick={() => setAutoScroll(v => !v)}
          className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1"
          style={autoScroll ? { color: 'var(--accent)', borderColor: 'rgba(34,211,238,0.3)' } : {}}>
          <ChevronDown size={12} /> Auto-scroll
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        <button onClick={download} className="btn-ghost p-2" title="Download Logs"><Download size={13} /></button>
        <button onClick={clearLogs} className="btn-ghost p-2" title="Clear View" style={{ color: 'var(--red)' }}><X size={13} /></button>
        <button onClick={load} className="btn-ghost p-2" title="Refresh">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs ml-2" style={{ color: 'var(--text3)' }}>{filteredLines.length} lines</span>
      </div>

      {/* Log viewer */}
      <div className="card overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="terminal-header shrink-0">
          <span className="terminal-dot bg-red-400/60" />
          <span className="terminal-dot bg-yellow-400/60" />
          <span className="terminal-dot bg-green-400/60" />
          <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>
            dmesg {isWatching ? '-w' : ''}
          </span>
          {isWatching && (
            <span className="ml-3 flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE STREAMING
            </span>
          )}
          {loading && <RefreshCw size={11} className="ml-auto animate-spin" style={{ color: 'var(--text3)' }} />}
        </div>
        <div className="flex-1 overflow-y-auto p-4 mono text-xs space-y-px"
          style={{ background: 'var(--code-bg)' }}>
          {filteredLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <RefreshCw size={32} className="mb-4" />
              <p>No logs available. {isWatching ? 'Waiting for messages...' : 'Try refreshing or starting realtime.'}</p>
            </div>
          ) : (
            filteredLines.map((line, i) => (
              <div key={i} className="leading-relaxed hover:bg-white/5 transition-colors" style={{ color: lineColor(line) }}>
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

