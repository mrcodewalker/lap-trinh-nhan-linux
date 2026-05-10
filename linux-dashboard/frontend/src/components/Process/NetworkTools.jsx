import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RefreshCw, X, CheckCircle, AlertCircle, Wifi, Globe, Route, Server, Copy } from 'lucide-react'
import api from '../../utils/api'

const TOOLS = [
  { id: 'ping',       label: 'Ping',       icon: Wifi,   placeholder: 'e.g. google.com', desc: 'ICMP reachability test' },
  { id: 'traceroute', label: 'Traceroute', icon: Route,  placeholder: 'e.g. 8.8.8.8',   desc: 'Trace network path' },
  { id: 'dns',        label: 'DNS Lookup', icon: Globe,  placeholder: 'e.g. github.com', desc: 'Resolve hostname' },
  { id: 'ifconfig',   label: 'Interfaces', icon: Server, placeholder: '',                desc: 'Network interfaces' },
]

const PING_COUNTS = [1, 4, 10, 20]

export default function NetworkTools() {
  const [tool, setTool]         = useState('ping')
  const [host, setHost]         = useState('')
  const [pingCount, setPingCount] = useState(4)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [history, setHistory]   = useState([])

  const run = async () => {
    if (tool !== 'ifconfig' && !host.trim()) return
    setLoading(true); setResult(null)
    const startTime = Date.now()
    try {
      let r
      if (tool === 'ping')       r = await api.post('/process/network/ping',       { host, count: pingCount })
      if (tool === 'traceroute') r = await api.post('/process/network/traceroute', { host })
      if (tool === 'dns')        r = await api.post('/process/network/dns',        { host })
      if (tool === 'ifconfig')   r = await api.get('/process/network/ifconfig')

      const text    = r.data.result || r.data.data || r.data.interfaces || 'No output'
      const success = r.data.success !== false
      const elapsed = Date.now() - startTime
      const entry   = { tool, host: host || 'local', text, success, elapsed, time: new Date().toLocaleTimeString() }
      setResult(entry)
      setHistory(h => [entry, ...h.slice(0, 9)])
    } catch (e) {
      const entry = { tool, host, text: e.response?.data?.error || 'Command failed', success: false, elapsed: Date.now() - startTime, time: new Date().toLocaleTimeString() }
      setResult(entry)
      setHistory(h => [entry, ...h.slice(0, 9)])
    } finally { setLoading(false) }
  }

  const copyResult = () => {
    if (result?.text) navigator.clipboard.writeText(result.text)
  }

  const current = TOOLS.find(t => t.id === tool)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Left panel */}
      <div className="space-y-3">
        {/* Tool selector */}
        <div className="card p-2 space-y-1">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => { setTool(t.id); setResult(null) }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={tool === t.id ? {
                background: 'rgba(34,211,238,0.08)',
                border: '1px solid rgba(34,211,238,0.2)',
                color: 'var(--accent)',
              } : {
                border: '1px solid transparent',
                color: 'var(--text2)',
              }}>
              <t.icon size={15} />
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="card p-3">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>History</p>
            <div className="space-y-1">
              {history.map((h, i) => (
                <button key={i} onClick={() => setResult(h)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left"
                  style={{ color: 'var(--text2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: h.success ? 'var(--green)' : 'var(--red)' }} />
                  <span className="text-xs mono truncate flex-1">{h.host}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{h.time}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="lg:col-span-2 space-y-3">
        {/* Input */}
        <div className="card p-4 space-y-3">
          {tool !== 'ifconfig' && (
            <div className="flex gap-2">
              <input value={host} onChange={e => setHost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && run()}
                placeholder={current?.placeholder}
                className="input flex-1" />
              {tool === 'ping' && (
                <select value={pingCount} onChange={e => setPingCount(Number(e.target.value))}
                  className="input w-20 text-xs" style={{ background: 'var(--input-bg)' }}>
                  {PING_COUNTS.map(n => <option key={n} value={n}>×{n}</option>)}
                </select>
              )}
            </div>
          )}
          <button onClick={run} disabled={loading || (tool !== 'ifconfig' && !host.trim())}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {loading
              ? <><RefreshCw size={14} className="animate-spin" /> Running...</>
              : <><Send size={14} /> Run {current?.label}</>
            }
          </button>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                {result.success
                  ? <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                  : <AlertCircle size={14} style={{ color: 'var(--red)' }} />
                }
                <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>
                  {result.tool} — {result.host}
                </span>
                <span className="text-[10px] ml-1" style={{ color: 'var(--text3)' }}>{result.elapsed}ms</span>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={copyResult}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text3)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
                    <Copy size={12} />
                  </button>
                  <button onClick={() => setResult(null)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text3)' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
              <pre className="code-block text-xs max-h-80 overflow-auto whitespace-pre-wrap break-words">
                {result.text}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && (
          <div className="card p-8 text-center">
            <current.icon size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              {tool === 'ifconfig' ? 'Click Run to show network interfaces' : `Enter a host and run ${current?.label}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
