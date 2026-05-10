import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Trash2, Search, Info, X, AlertTriangle,
  Play, Square, RotateCcw, Zap, ChevronDown, ChevronUp,
  Activity, Cpu, MemoryStick, Clock, User, Terminal
} from 'lucide-react'
import api from '../../utils/api'

const SIGNALS = [
  { name: 'SIGTERM', desc: 'Graceful terminate', color: '#fbbf24' },
  { name: 'SIGKILL', desc: 'Force kill',         color: '#f87171' },
  { name: 'SIGHUP',  desc: 'Reload config',      color: '#34d399' },
  { name: 'SIGINT',  desc: 'Interrupt (Ctrl+C)', color: '#60a5fa' },
  { name: 'SIGSTOP', desc: 'Pause process',      color: '#a78bfa' },
  { name: 'SIGCONT', desc: 'Resume process',     color: '#22d3ee' },
]

const cpuColor = (v) => {
  const n = parseFloat(v)
  if (n > 50) return '#f87171'
  if (n > 20) return '#fbbf24'
  if (n > 5)  return '#34d399'
  return 'rgba(255,255,255,0.4)'
}

const statBadge = (stat) => {
  if (!stat) return 'badge-cyan'
  if (stat.startsWith('R')) return 'badge-green'
  if (stat.startsWith('S')) return 'badge-cyan'
  if (stat.startsWith('D')) return 'badge-yellow'
  if (stat.startsWith('Z')) return 'badge-red'
  if (stat.startsWith('T')) return 'badge-purple'
  return 'badge-cyan'
}

export default function ProcessManager() {
  const [processes, setProcesses] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState('cpu')
  const [sortDir, setSortDir]     = useState('desc')
  const [modal, setModal]         = useState(null)
  const [procInfo, setProcInfo]   = useState('')
  const [signal, setSignal]       = useState('SIGTERM')
  const [killResult, setKillResult] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filterUser, setFilterUser]   = useState('all')
  const [users, setUsers]             = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/process/list')
      const procs = r.data.processes || []
      setProcesses(procs)
      const uniqueUsers = [...new Set(procs.map(p => p.user).filter(Boolean))]
      setUsers(uniqueUsers.slice(0, 10))
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load processes')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    if (!autoRefresh) return
    const t = setInterval(load, 2500)
    return () => clearInterval(t)
  }, [load, autoRefresh])

  const loadInfo = async (pid) => {
    setProcInfo('Loading...')
    try {
      const r = await api.get(`/process/info/${pid}`)
      setProcInfo(r.data.info || 'No info available')
    } catch { setProcInfo('Could not read /proc/' + pid + '/status') }
  }

  const sendSignal = async () => {
    setKillResult(null)
    try {
      const r = await api.post('/process/kill', { pid: modal.data.pid, signal })
      setKillResult({ success: true, msg: r.data.message })
      setTimeout(() => { setModal(null); setKillResult(null); load() }, 1200)
    } catch (e) {
      setKillResult({ success: false, msg: e.response?.data?.error || 'Failed' })
    }
  }

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const sorted = [...processes]
    .filter(p => {
      const matchSearch = p.command?.toLowerCase().includes(search.toLowerCase()) || p.pid?.includes(search)
      const matchUser   = filterUser === 'all' || p.user === filterUser
      return matchSearch && matchUser
    })
    .sort((a, b) => {
      let va, vb
      if (sortBy === 'cpu') { va = parseFloat(a.cpu); vb = parseFloat(b.cpu) }
      else if (sortBy === 'mem') { va = parseFloat(a.mem); vb = parseFloat(b.mem) }
      else if (sortBy === 'pid') { va = parseInt(a.pid); vb = parseInt(b.pid) }
      else return 0
      return sortDir === 'desc' ? vb - va : va - vb
    })

  const SortIcon = ({ col }) => sortBy === col
    ? (sortDir === 'desc' ? <ChevronDown size={11} className="inline ml-0.5" /> : <ChevronUp size={11} className="inline ml-0.5" />)
    : null

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search PID or command..." className="input pl-9 py-2" />
        </div>

        {/* User filter */}
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
          className="input py-2 w-28 text-xs bg-black/30">
          <option value="all">All users</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        {/* Sort */}
        <div className="flex items-center gap-1">
          {['cpu','mem','pid'].map(s => (
            <button key={s} onClick={() => toggleSort(s)}
              className={`btn-ghost py-1.5 px-2.5 text-xs uppercase ${sortBy === s ? 'text-cyan-400 border-cyan-500/30' : ''}`}>
              {s}<SortIcon col={s} />
            </button>
          ))}
        </div>

        {/* Auto refresh toggle */}
        <button onClick={() => setAutoRefresh(v => !v)}
          className={`btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 ${autoRefresh ? 'text-emerald-400 border-emerald-500/30' : ''}`}>
          <Activity size={12} /> {autoRefresh ? 'Live' : 'Paused'}
        </button>

        <button onClick={load} className="btn-ghost p-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs text-white/30">{sorted.length} / {processes.length}</span>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl text-xs text-red-400 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          {error} <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="cursor-pointer hover:text-white/60" onClick={() => toggleSort('pid')}>
                  PID <SortIcon col="pid" />
                </th>
                <th>User</th>
                <th className="cursor-pointer hover:text-white/60" onClick={() => toggleSort('cpu')}>
                  CPU% <SortIcon col="cpu" />
                </th>
                <th className="cursor-pointer hover:text-white/60" onClick={() => toggleSort('mem')}>
                  MEM% <SortIcon col="mem" />
                </th>
                <th>Stat</th>
                <th>Start</th>
                <th>Command</th>
                <th className="text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 40).map((proc, i) => (
                <motion.tr key={proc.pid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.008, 0.3) }}
                  className="group cursor-pointer"
                  onClick={() => { setModal({ type: 'info', data: proc }); loadInfo(proc.pid) }}
                >
                  <td className="font-mono text-cyan-400/80 font-semibold">{proc.pid}</td>
                  <td className="text-white/45 text-xs">{proc.user}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(parseFloat(proc.cpu), 100)}%`, background: cpuColor(proc.cpu) }} />
                      </div>
                      <span className="font-mono text-xs font-semibold" style={{ color: cpuColor(proc.cpu) }}>
                        {proc.cpu}
                      </span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-violet-400/80">{proc.mem}</td>
                  <td>
                    <span className={`badge ${statBadge(proc.stat)} text-[10px]`}>{proc.stat}</span>
                  </td>
                  <td className="text-xs text-white/30 font-mono">{proc.start}</td>
                  <td className="max-w-[220px] truncate text-white/55 text-xs font-mono">{proc.command}</td>
                  <td className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setModal({ type: 'info', data: proc }); loadInfo(proc.pid) }}
                        className="p-1.5 rounded-lg hover:bg-cyan-500/15 text-cyan-400/50 hover:text-cyan-400 transition-colors"
                        title="Details">
                        <Info size={12} />
                      </button>
                      <button
                        onClick={() => { setModal({ type: 'kill', data: proc }); setKillResult(null) }}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400/50 hover:text-red-400 transition-colors"
                        title="Send signal">
                        <Zap size={12} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && !loading && (
          <div className="py-10 text-center text-xs text-white/30">No processes match filter</div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop" onClick={() => setModal(null)}>
            <motion.div
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>

              {/* ── Process Info ── */}
              {modal.type === 'info' && (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <Terminal size={16} className="text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">Process {modal.data.pid}</p>
                        <p className="text-xs text-white/35 font-mono truncate max-w-[260px]">{modal.data.command}</p>
                      </div>
                    </div>
                    <button onClick={() => setModal(null)}><X size={16} className="text-white/30" /></button>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { icon: Cpu,        label: 'CPU',   value: modal.data.cpu + '%',  color: cpuColor(modal.data.cpu) },
                      { icon: MemoryStick,label: 'MEM',   value: modal.data.mem + '%',  color: '#a78bfa' },
                      { icon: User,       label: 'User',  value: modal.data.user,       color: '#22d3ee' },
                      { icon: Activity,   label: 'State', value: modal.data.stat,       color: '#34d399' },
                      { icon: Clock,      label: 'Start', value: modal.data.start,      color: '#fbbf24' },
                      { icon: Clock,      label: 'Time',  value: modal.data.time,       color: '#f472b6' },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="card p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon size={11} style={{ color }} />
                          <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
                        </div>
                        <p className="text-sm font-mono font-semibold" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* /proc/pid/status */}
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">/proc/{modal.data.pid}/status</p>
                  <pre className="code-block text-xs max-h-52 overflow-auto">{procInfo}</pre>

                  {/* Quick actions */}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setModal({ type: 'kill', data: modal.data })}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-red-400 transition-all"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <Zap size={13} /> Send Signal
                    </button>
                    <button onClick={() => setModal(null)} className="btn-ghost flex-1 text-xs">Close</button>
                  </div>
                </>
              )}

              {/* ── Kill / Signal ── */}
              {modal.type === 'kill' && (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Send Signal to PID {modal.data.pid}</p>
                      <p className="text-xs text-white/35 font-mono truncate max-w-[260px]">{modal.data.command}</p>
                    </div>
                    <button onClick={() => setModal(null)} className="ml-auto"><X size={16} className="text-white/30" /></button>
                  </div>

                  {/* Signal picker */}
                  <p className="text-xs text-white/30 mb-3">Choose signal:</p>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {SIGNALS.map(s => (
                      <button key={s.name} onClick={() => setSignal(s.name)}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                          signal === s.name
                            ? 'border-opacity-50 bg-opacity-10'
                            : 'border-white/5 hover:border-white/10 hover:bg-white/3'
                        }`}
                        style={signal === s.name ? {
                          borderColor: s.color + '50',
                          background: s.color + '10',
                        } : {}}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <div>
                          <p className="text-xs font-mono font-semibold" style={{ color: signal === s.name ? s.color : 'rgba(255,255,255,0.7)' }}>
                            {s.name}
                          </p>
                          <p className="text-[10px] text-white/30">{s.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Result feedback */}
                  <AnimatePresence>
                    {killResult && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className={`px-4 py-2.5 rounded-xl text-xs mb-4 flex items-center gap-2 ${
                          killResult.success
                            ? 'text-emerald-400 bg-emerald-500/8 border border-emerald-500/15'
                            : 'text-red-400 bg-red-500/8 border border-red-500/15'
                        }`}>
                        {killResult.success ? '✓' : '✗'} {killResult.msg}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    <button onClick={() => setModal(null)} className="btn-ghost flex-1">Cancel</button>
                    <button onClick={sendSignal}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}>
                      <Zap size={14} /> Send {signal}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
