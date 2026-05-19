import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, RefreshCw, X, CheckCircle, AlertCircle, 
  Wifi, Globe, Route, Server, Copy, Activity,
  Database, Shield, Hash, Zap
} from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'
import ActivityLog from '../ActivityLog/ActivityLog'

const TOOLS = [
  { id: 'ping',       label: 'Visual Ping',    icon: Wifi,   placeholder: 'google.com', desc: 'Real-time latency graph' },
  { id: 'traceroute', label: 'Route Trace',    icon: Route,  placeholder: '8.8.8.8',    desc: 'Hops path visualization' },
  { id: 'dns',        label: 'DNS Lookup',     icon: Globe,  placeholder: 'github.com', desc: 'Detailed record analysis' },
  { id: 'ifconfig',   label: 'Interface Hub',  icon: Server, placeholder: '',           desc: 'Hardware link status' },
]

export default function NetworkTools() {
  const [tool, setTool]         = useState('ping')
  const [host, setHost]         = useState('')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [history, setHistory]   = useState([])
  const [pingData, setPingData] = useState([]) // For graph
  
  const timerRef = useRef(null)

  const run = async () => {
    if (tool !== 'ifconfig' && !host.trim()) return
    setLoading(true); setResult(null)
    const startTime = Date.now()
    
    try {
      let r
      if (tool === 'ping')       r = await api.post('/process/network/ping',       { host, count: 4 })
      if (tool === 'traceroute') r = await api.post('/process/network/traceroute', { host })
      if (tool === 'dns')        r = await api.post('/process/network/dns',        { host })
      if (tool === 'ifconfig')   r = await api.get('/process/network/ifconfig')

      const text    = r.data.result || r.data.data || r.data.interfaces || 'No output'
      const success = r.data.success !== false
      const elapsed = Date.now() - startTime
      
      const entry = { 
        tool, 
        host: host || 'local', 
        text, 
        success, 
        elapsed, 
        time: new Date().toLocaleTimeString(),
        raw: r.data
      }
      
      if (tool === 'ping' && success) {
        // Extract latencies from text: time=12.3 ms
        const matches = text.match(/time=([\d.]+)/g)
        if (matches) {
          const latencies = matches.map(m => parseFloat(m.split('=')[1]))
          setPingData(prev => [...prev, ...latencies].slice(-30))
        }
      }

      setResult(entry)
      setHistory(h => [entry, ...h.slice(0, 9)])
    } catch (e) {
      const entry = { tool, host, text: e.response?.data?.error || 'Command failed', success: false, elapsed: Date.now() - startTime, time: new Date().toLocaleTimeString() }
      setResult(entry)
    } finally { setLoading(false) }
  }

  const copyResult = () => {
    if (result?.text) navigator.clipboard.writeText(result.text)
  }

  // Parse ifconfig/ip addr output into cards
  const interfaces = result?.tool === 'ifconfig' ? (
    result.text.split('\n\n').filter(s => s.trim()).map(s => {
      const name = s.match(/^(\w+):?/) ? s.match(/^(\w+):?/)[1] : 'unknown'
      const ip = s.match(/inet ([\d.]+)/) ? s.match(/inet ([\d.]+)/)[1] : 'No IP'
      const mac = s.match(/ether ([a-f\d:]+)/) ? s.match(/ether ([a-f\d:]+)/)[1] : 'No MAC'
      const status = s.toLowerCase().includes('up') ? 'UP' : 'DOWN'
      return { name, ip, mac, status, raw: s }
    })
  ) : []

  return (
    <div className="space-y-6">
      {/* Header & Tool Tabs */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-1 gap-2 w-full md:w-64">
          {TOOLS.map(t => (
            <button 
              key={t.id} 
              onClick={() => { setTool(t.id); setResult(null); setPingData([]) }}
              className={clsx(
                "group flex items-center gap-3 p-3 rounded-2xl border transition-all text-left relative overflow-hidden",
                tool === t.id 
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
                  : "bg-white/[0.02] border-white/5 text-white/40 hover:border-white/10 hover:bg-white/[0.04]"
              )}
            >
              <div className={clsx(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                tool === t.id ? "bg-cyan-500/20" : "bg-white/5"
              )}>
                <t.icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest">{t.label}</p>
                <p className="text-[9px] opacity-40 truncate">{t.desc}</p>
              </div>
              {tool === t.id && <motion.div layoutId="active" className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4">
          {/* Main Action Bar */}
          <div className="card p-4 flex flex-col sm:flex-row gap-3 border-white/10 bg-white/[0.03] shadow-xl">
            {tool !== 'ifconfig' && (
              <div className="relative flex-1">
                <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  value={host} onChange={e => setHost(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && run()}
                  placeholder={`Enter hostname or IP to ${tool}...`}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all font-mono"
                />
              </div>
            )}
            <button 
              onClick={run} 
              disabled={loading || (tool !== 'ifconfig' && !host.trim())}
              className="btn-primary px-8 py-3 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm tracking-widest"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
              {loading ? 'PROCESSING...' : `EXECUTE ${tool.toUpperCase()}`}
            </button>
          </div>

          {/* Visualization Area */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="card p-12 text-center border-dashed border-white/10">
                <RefreshCw size={40} className="mx-auto mb-4 text-cyan-500 animate-spin" />
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/20">Analyzing Network Path...</p>
              </motion.div>
            ) : result ? (
              <motion.div key={result.time} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                
                {/* Visual Widgets based on tool */}
                {tool === 'ping' && pingData.length > 0 && (
                  <div className="card p-5 bg-gradient-to-br from-cyan-500/5 to-transparent">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Activity size={18} className="text-cyan-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest">Latency Timeline</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[9px] text-white/20 font-bold uppercase">Avg Response</p>
                          <p className="text-sm font-bold font-mono text-cyan-400">{(pingData.reduce((a,b)=>a+b,0)/pingData.length).toFixed(2)}ms</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end gap-1.5 h-24">
                      {pingData.map((v, i) => (
                        <motion.div 
                          key={i} initial={{ height: 0 }} animate={{ height: `${Math.min(100, (v / 200) * 100)}%` }}
                          className="flex-1 bg-cyan-500/40 rounded-t-sm hover:bg-cyan-500 transition-colors relative group"
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {v}ms
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {tool === 'ifconfig' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {interfaces.map(iface => (
                      <div key={iface.name} className="card p-4 border-white/5 bg-white/[0.02] hover:border-cyan-500/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                              <Hash size={14} />
                            </div>
                            <span className="text-sm font-bold font-mono">{iface.name}</span>
                          </div>
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[9px] font-bold",
                            iface.status === 'UP' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                          )}>
                            {iface.status}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-white/20">IPV4 ADDR</span>
                            <span className="text-white/60 font-mono">{iface.ip}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-white/20">HW ADDR</span>
                            <span className="text-white/60 font-mono">{iface.mac}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Raw Output Terminal */}
                <div className="terminal-wrap h-64">
                  <div className="terminal-header">
                    <div className="flex gap-1.5 mr-4">
                      <span className="w-2 h-2 rounded-full bg-red-400/40" />
                      <span className="w-2 h-2 rounded-full bg-yellow-400/40" />
                      <span className="w-2 h-2 rounded-full bg-green-400/40" />
                    </div>
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{tool}_output.log</span>
                    <button onClick={copyResult} className="ml-auto hover:text-cyan-400 transition-colors">
                      <Copy size={12} />
                    </button>
                  </div>
                  <pre className="p-4 text-[11px] font-mono leading-relaxed text-cyan-400/80 overflow-auto h-full no-scrollbar">
                    {result.text}
                  </pre>
                </div>

              </motion.div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <Globe size={48} className="mx-auto mb-4 text-white/5" />
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/10">Waiting for command entry...</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Realtime activity log: ping / traceroute / dig commands thật */}
      <ActivityLog scope="network" title="Network tools · live commands" height={200} className="mt-4" />
    </div>
  )
}
