import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RefreshCw, X, CheckCircle, AlertCircle, Wifi, Globe, Search, Route, Server, Copy } from 'lucide-react'
import api from '../../utils/api'

const TOOLS = [
  { id: 'ping',       label: 'Ping',        icon: Wifi,   placeholder: 'e.g. google.com or 8.8.8.8', desc: 'ICMP reachability test' },
  { id: 'traceroute', label: 'Traceroute',  icon: Route,  placeholder: 'e.g. 8.8.8.8',              desc: 'Trace network path' },
  { id: 'dns',        label: 'DNS Lookup',  icon: Globe,  placeholder: 'e.g. github.com',            desc: 'Resolve hostname' },
  { id: 'ifconfig',   label: 'Interfaces',  icon: Server, placeholder: '',                           desc: 'Network interfaces' },
]

const PING_COUNTS = [1, 4, 10, 20]

export default function NetworkTools() {
  const [tool, setTool]       = useState('ping')
  const [host, setHost]       = useState('')
  const [pingCount, setPingCount] = useState(4)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])

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

      const entry = { tool, host: host || 'local', text, success, elapsed, time: new Date().toLocaleTimeString() }
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
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                tool === t.id
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                  : 'hover:bg-white/3 text-white/50 hover:text-white/80 border border-transparent'
              }`}>
              <t.icon size={15} />
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-[10px] text-white/25">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="card p-3">
            <p className="text-xs text-white/30 uppercase tracking-wider mb-2">History</p>
            <div className="space-y-1">
              {history.map((h, i) => (
                <button key={i} onClick={() => setResult(h)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/3 transition-colors text-left">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-white/50 font-mono truncate flex-1">{h.host}</span>
                  <span className="text-[10px] text-white/25">{h.time}</span>
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
                  className="input w-20 bg-black/30 text-xs">
                  {PING_COUNTS.map(n => <option key={n} value={n}>×{n}</option>)}
                </select>
              )}
            </div>
          )}
          <button onClick={run} disabled={loading || (tool !== 'ifconfig' && !host.trim())}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
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
                  ? <CheckCircle size={14} className="text-emerald-400" />
                  : <AlertCircle size={14} className="text-red-400" />
                }
                <span className="text-xs font-semibold text-white/60">{result.tool} — {result.host}</span>
                <span className="text-[10px] text-white/25 ml-1">{result.elapsed}ms</span>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={copyResult}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                    title="Copy">
                    <Copy size={12} />
                  </button>
                  <button onClick={() => setResult(null)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
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
            <current.icon size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-xs text-white/25">
              {tool === 'ifconfig' ? 'Click Run to show network interfaces' : `Enter a host and run ${current?.label}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
