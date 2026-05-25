import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  RefreshCw, Search, Network, X, Shield, 
  AlertTriangle, Eye, Activity, Filter,
  ExternalLink, Trash2, Cpu, Globe
} from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'
import ActivityLog from '../ActivityLog/ActivityLog'

const SUSPICIOUS_PORTS = [22, 23, 3389, 4444, 5900, 6666, 31337]

const stateColor = (state) => {
  const s = state?.toUpperCase() || ''
  if (s === 'LISTEN')      return 'text-green-400 bg-green-400/10 border-green-400/20'
  if (s === 'ESTAB')       return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
  if (s === 'TIME-WAIT')   return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
  if (s === 'CLOSE-WAIT')  return 'text-red-400 bg-red-400/10 border-red-400/20'
  return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
}

export default function SocketMonitor() {
  const [connections, setConnections] = useState([])
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState('all')
  const [modal, setModal]             = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    load()
    if (!autoRefresh) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [autoRefresh])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/process/network/connections')
      setConnections(r.data.connections || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const isSuspicious = (conn) => {
    const port = parseInt(conn.localAddr?.split(':').pop())
    return SUSPICIOUS_PORTS.includes(port)
  }

  const filtered = useMemo(() => connections.filter(c => {
    const term = search.toLowerCase()
    const matchSearch = c.localAddr?.toLowerCase().includes(term) || 
                       c.peerAddr?.toLowerCase().includes(term) || 
                       c.processName?.toLowerCase().includes(term) ||
                       c.pid?.includes(term)
    
    const matchFilter = filter === 'all'
      || (filter === 'tcp'        && c.proto?.toLowerCase().includes('tcp'))
      || (filter === 'udp'        && c.proto?.toLowerCase().includes('udp'))
      || (filter === 'listen'     && c.state === 'LISTEN')
      || (filter === 'suspicious' && isSuspicious(c))
    return matchSearch && matchFilter
  }), [connections, search, filter])

  const stats = useMemo(() => ({
    total: connections.length,
    listening: connections.filter(c => c.state === 'LISTEN').length,
    established: connections.filter(c => c.state === 'ESTAB').length,
    suspicious: connections.filter(isSuspicious).length
  }), [connections])

  const killProcess = async (pid) => {
    if (!confirm(`Kill process PID ${pid}?`)) return
    try {
      await api.post('/process/kill', { pid })
      load()
    } catch (e) {
      alert('Failed to kill process: ' + (e.response?.data?.error || e.message))
    }
  }

  return (
    <div className="space-y-6">
      {/* Visual Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Network Sockets', value: stats.total, icon: Network, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'Active Listeners', value: stats.listening, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Live Connections', value: stats.established, icon: Globe, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Security Alerts', value: stats.suspicious, icon: Shield, color: stats.suspicious > 0 ? 'text-red-400' : 'text-emerald-400', bg: stats.suspicious > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-4 border-white/5 bg-white/[0.02]">
            <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", s.bg)}>
              <s.icon size={24} className={s.color} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{s.label}</p>
              <p className={clsx("text-2xl font-bold font-mono", s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by IP, Port or Process..." 
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-cyan-500/50 outline-none transition-all"
            />
          </div>
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {['all','tcp','udp','listen'].map(f => (
              <button 
                key={f} onClick={() => setFilter(f)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  filter === f ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-white/40 hover:text-white"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold transition-all border",
              autoRefresh ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/5 border-white/10 text-white/30"
            )}
          >
            <div className={clsx("w-1.5 h-1.5 rounded-full", autoRefresh ? "bg-green-400 animate-pulse" : "bg-white/20")} />
            {autoRefresh ? 'LIVE MONITORING' : 'PAUSED'}
          </button>
          <button onClick={load} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.slice(0, 40).map((conn, i) => {
          const suspicious = isSuspicious(conn)
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => setModal(conn)}
              className={clsx(
                "group relative overflow-hidden card p-4 border transition-all cursor-pointer hover:border-cyan-500/30",
                suspicious ? "border-red-500/20 bg-red-500/5" : "border-white/5 hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    stateColor(conn.state)
                  )}>
                    <Network size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-white/80">{conn.localAddr}</span>
                      <ChevronRight size={10} className="text-white/20" />
                      <span className="text-xs font-mono text-white/40">{conn.peerAddr === '*:*' ? 'ANY' : conn.peerAddr}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-bold text-white/40 uppercase tracking-tighter">
                        {conn.proto}
                      </span>
                      {conn.processName && (
                        <div className="flex items-center gap-1 text-[10px] text-cyan-400/60 font-mono">
                          <Cpu size={10} /> {conn.processName} <span className="text-white/20">({conn.pid})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={clsx("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border", stateColor(conn.state))}>
                    {conn.state || 'N/A'}
                  </span>
                  {suspicious && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                      <Shield size={10} /> THREAT DETECTED
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons on hover */}
              <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                {conn.pid && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); killProcess(conn.pid) }}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    title="Kill Owner Process"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <button className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all">
                  <Eye size={12} />
                </button>
              </div>

              {/* Background accent */}
              <div className={clsx(
                "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-5 transition-opacity group-hover:opacity-10",
                suspicious ? "bg-red-500" : "bg-cyan-500"
              )} />
            </motion.div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center card border-dashed border-white/10">
          <Network size={48} className="mx-auto mb-4 text-white/10" />
          <p className="text-sm font-medium text-white/40">No network sockets detected matching your filters.</p>
        </div>
      )}

      {/* Connection Details Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop" onClick={() => setModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="modal-box max-w-lg border-white/10" onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">Socket Analysis</h3>
                    <p className="text-[10px] text-white/40 font-mono">{modal.proto} Connection</p>
                  </div>
                </div>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X size={18} className="text-white/40" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Local Endpoint', value: modal.localAddr },
                  { label: 'Remote Endpoint', value: modal.peerAddr },
                  { label: 'Connection State', value: modal.state || 'UNKNOWN' },
                  { label: 'Protocol', value: modal.proto },
                  { label: 'Process PID', value: modal.pid || 'N/A' },
                  { label: 'Process Name', value: modal.processName || 'N/A' },
                  { label: 'Receive Queue', value: modal.recvQ },
                  { label: 'Send Queue', value: modal.sendQ },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter mb-1">{item.label}</p>
                    <p className="text-xs font-mono text-white/80 truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                {modal.pid && (
                  <button 
                    onClick={() => { killProcess(modal.pid); setModal(null) }}
                    className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                  >
                    Kill Process
                  </button>
                )}
                <button 
                  onClick={() => setModal(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white/80 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Close Analysis
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Realtime activity log scope=process — show kill from socket grid */}
      <ActivityLog scope="process" title="Socket-related actions · live" height={180} />
    </div>
  )
}

function ChevronRight(props) {
  return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
}
