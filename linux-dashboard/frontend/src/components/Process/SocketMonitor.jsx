import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Search, Network, X, Shield, AlertTriangle, Eye } from 'lucide-react'
import api from '../../utils/api'

const SUSPICIOUS_PORTS = [22, 23, 3389, 4444, 5900, 6666, 31337]

const stateColor = (state) => {
  if (!state) return 'badge-cyan'
  if (state === 'LISTEN')      return 'badge-green'
  if (state === 'ESTABLISHED') return 'badge-cyan'
  if (state === 'TIME_WAIT')   return 'badge-yellow'
  if (state === 'CLOSE_WAIT')  return 'badge-red'
  return 'badge-purple'
}

const isSuspicious = (conn) => {
  const port = parseInt(conn.localAddr?.split(':').pop())
  return SUSPICIOUS_PORTS.includes(port)
}

export default function SocketMonitor() {
  const [connections, setConnections] = useState([])
  const [stats, setStats]             = useState('')
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
      const [connR, statsR] = await Promise.all([
        api.get('/process/network/connections'),
        api.get('/process/network/stats'),
      ])
      setConnections(connR.data.connections || [])
      setStats(statsR.data.stats || '')
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const filtered = connections.filter(c => {
    const matchSearch = c.localAddr?.includes(search) || c.peerAddr?.includes(search) || c.proto?.includes(search)
    const matchFilter = filter === 'all'
      || (filter === 'tcp'        && c.proto?.toLowerCase().includes('tcp'))
      || (filter === 'udp'        && c.proto?.toLowerCase().includes('udp'))
      || (filter === 'listen'     && c.state === 'LISTEN')
      || (filter === 'suspicious' && isSuspicious(c))
    return matchSearch && matchFilter
  })

  const suspiciousCount = connections.filter(isSuspicious).length

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',       value: connections.length,                                        color: 'var(--accent)' },
          { label: 'Listening',   value: connections.filter(c => c.state === 'LISTEN').length,      color: 'var(--green)' },
          { label: 'Established', value: connections.filter(c => c.state === 'ESTABLISHED').length, color: 'var(--accent2)' },
          { label: 'Suspicious',  value: suspiciousCount, color: suspiciousCount > 0 ? 'var(--red)' : 'var(--green)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3">
            <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{label}</p>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Stats raw */}
      {stats && (
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>
            Socket Statistics
          </p>
          <pre className="code-block text-xs">{stats}</pre>
        </div>
      )}

      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by address or proto..." className="input pl-9 py-2" />
        </div>
        <div className="flex items-center gap-1">
          {['all','tcp','udp','listen','suspicious'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="btn-ghost py-1.5 px-2.5 text-xs capitalize"
              style={filter === f ? { color: 'var(--accent)', borderColor: 'rgba(34,211,238,0.3)' } : {}}>
              {f === 'suspicious' && suspiciousCount > 0
                ? <span className="flex items-center gap-1">
                    <AlertTriangle size={10} style={{ color: 'var(--red)' }} />{f}
                  </span>
                : f
              }
            </button>
          ))}
        </div>
        <button onClick={() => setAutoRefresh(v => !v)}
          className="btn-ghost py-1.5 px-3 text-xs"
          style={autoRefresh ? { color: 'var(--green)', borderColor: 'rgba(52,211,153,0.3)' } : {}}>
          {autoRefresh ? 'Live' : 'Paused'}
        </button>
        <button onClick={load} className="btn-ghost p-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs" style={{ color: 'var(--text3)' }}>{filtered.length}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proto</th>
                <th>Local Address</th>
                <th>Peer Address</th>
                <th>State</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map((conn, i) => {
                const suspicious = isSuspicious(conn)
                return (
                  <motion.tr key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className="group cursor-pointer"
                    style={suspicious ? { background: 'rgba(239,68,68,0.04)' } : {}}
                    onClick={() => setModal({ conn })}>
                    <td>
                      <span className={`badge ${conn.proto?.includes('6') ? 'badge-purple' : 'badge-cyan'} text-[10px]`}>
                        {conn.proto}
                      </span>
                    </td>
                    <td className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                      {suspicious && <AlertTriangle size={10} className="inline mr-1" style={{ color: 'var(--red)' }} />}
                      {conn.localAddr}
                    </td>
                    <td className="font-mono text-xs" style={{ color: 'var(--text3)' }}>{conn.peerAddr}</td>
                    <td>
                      {conn.state && (
                        <span className={`badge ${stateColor(conn.state)} text-[10px]`}>{conn.state}</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button onClick={e => { e.stopPropagation(); setModal({ conn }) }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--accent)' }}>
                        <Eye size={12} />
                      </button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Network size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
            <p className="text-xs" style={{ color: 'var(--text3)' }}>No connections match filter</p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop" onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  {isSuspicious(modal.conn)
                    ? <AlertTriangle size={18} style={{ color: 'var(--red)' }} />
                    : <Shield size={18} style={{ color: 'var(--green)' }} />
                  }
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Connection Detail</p>
                </div>
                <button onClick={() => setModal(null)}><X size={16} style={{ color: 'var(--text3)' }} /></button>
              </div>

              <div className="space-y-1">
                {[
                  ['Protocol',      modal.conn.proto],
                  ['Local Address', modal.conn.localAddr],
                  ['Peer Address',  modal.conn.peerAddr],
                  ['State',         modal.conn.state],
                  ['Recv-Q',        modal.conn.recvQ],
                  ['Send-Q',        modal.conn.sendQ],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex items-center justify-between py-2"
                    style={{ borderBottom: '1px solid var(--border2)' }}>
                    <span className="text-xs" style={{ color: 'var(--text3)' }}>{k}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text2)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {isSuspicious(modal.conn) && (
                <div className="mt-4 px-4 py-3 rounded-xl text-xs flex items-center gap-2"
                  style={{ color: 'var(--red)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <AlertTriangle size={13} />
                  This port is commonly associated with suspicious activity
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
