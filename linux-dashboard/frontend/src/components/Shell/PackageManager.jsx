import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Search, Trash2, Download, RefreshCw, X, CheckCircle, AlertCircle, Terminal as TerminalIcon } from 'lucide-react'
import api from '../../utils/api'
import { useSocketStore } from '../../store/socketStore'

export default function PackageManager() {
  const [packages, setPackages]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [installPkg, setInstallPkg] = useState('')
  const [busy, setBusy]             = useState(null)
  
  // Real-time log state
  const [logModal, setLogModal]     = useState(null) // { title, content, success, running }
  const logEndRef = useRef(null)
  const socket = useSocketStore(state => state.socket)

  useEffect(() => { 
    loadPackages() 
    
    if (socket) {
      socket.on('packages:output', (data) => {
        setLogModal(prev => prev ? { ...prev, content: prev.content + data.data } : null)
      })
      socket.on('packages:close', (data) => {
        setLogModal(prev => prev ? { ...prev, running: false, success: data.code === 0 } : null)
        loadPackages()
      })
    }

    return () => {
      if (socket) {
        socket.off('packages:output')
        socket.off('packages:close')
      }
    }
  }, [socket])

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logModal?.content])

  const loadPackages = async () => {
    setLoading(true); setError(null)
    try {
      const r = await api.get('/shell/packages/list')
      setPackages(r.data.packages || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load packages')
    } finally { setLoading(false) }
  }

  const install = () => {
    if (!installPkg.trim() || !socket) return
    const pkg = installPkg.trim()
    setLogModal({ 
      title: `Installing: ${pkg}`, 
      content: `[system] Starting installation of ${pkg}...\n`, 
      running: true, 
      success: null 
    })
    socket.emit('packages:install', { name: pkg, id: 'pkg-install' })
    setInstallPkg('')
  }

  const remove = (pkg) => {
    if (!confirm(`Remove package "${pkg}"?`) || !socket) return
    setLogModal({ 
      title: `Removing: ${pkg}`, 
      content: `[system] Removing ${pkg}...\n`, 
      running: true, 
      success: null 
    })
    socket.emit('packages:remove', { name: pkg, id: 'pkg-remove' })
  }

  const [searchResults, setSearchResults] = useState('')
  const [searching, setSearching]   = useState(false)

  const searchApt = async () => {
    if (!search.trim()) return
    setSearching(true); setSearchResults('')
    try {
      const r = await api.get('/shell/packages/search', { params: { query: search } })
      setSearchResults(r.data.results || 'No results')
    } catch (e) {
      setSearchResults(e.response?.data?.error || 'Search failed')
    } finally { setSearching(false) }
  }

  const filtered = packages.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Install bar */}
      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
          Install Package
        </p>
        <div className="flex gap-2">
          <input value={installPkg} onChange={e => setInstallPkg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && install()}
            placeholder="e.g. nginx, curl, git..." className="input flex-1" />
          <button onClick={install} disabled={logModal?.running || !installPkg.trim()}
            className="btn-primary flex items-center gap-2 px-5 disabled:opacity-40">
            {logModal?.running ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            Install
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="card p-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchApt()}
            placeholder="Filter installed / search apt..." className="input pl-9" />
        </div>
        <button onClick={searchApt} disabled={searching}
          className="btn-ghost flex items-center gap-1.5 text-xs">
          {searching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
          Search apt
        </button>
        <button onClick={loadPackages} className="btn-ghost p-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {searchResults && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
              apt search results
            </p>
            <button onClick={() => setSearchResults('')}>
              <X size={13} style={{ color: 'var(--text3)' }} />
            </button>
          </div>
          <pre className="code-block text-xs max-h-48 overflow-auto">{searchResults}</pre>
        </div>
      )}

      {error && (
        <div className="banner-error">
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border2)' }}>
          <span className="text-xs" style={{ color: 'var(--text3)' }}>{filtered.length} packages</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs" style={{ color: 'var(--text3)' }}>Loading packages...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs" style={{ color: 'var(--text3)' }}>No packages found</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {filtered.map((pkg, i) => (
              <motion.div key={pkg.name}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                className="flex items-center gap-3 px-4 py-2.5 group"
                style={{ borderBottom: '1px solid var(--border2)' }}>
                <Package size={14} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm mono" style={{ color: 'var(--text)' }}>{pkg.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text3)' }}>{pkg.version}</span>
                </div>
                <span className="text-xs truncate max-w-[200px] hidden md:block" style={{ color: 'var(--text3)' }}>
                  {pkg.description}
                </span>
                <button onClick={() => remove(pkg.name)} disabled={logModal?.running}
                  className="btn-danger py-1 px-2.5 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={11} /> Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Real-time Log Modal */}
      <AnimatePresence>
        {logModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop z-[100]" onClick={() => !logModal.running && setLogModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="modal-box max-w-2xl bg-[#0a0b10] border-cyan-500/20" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-1.5 mr-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${logModal.running ? 'bg-yellow-500 animate-pulse' : logModal.success ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <TerminalIcon size={14} className="text-cyan-400" />
                <h3 className="font-bold text-xs uppercase tracking-widest text-white/80">{logModal.title}</h3>
                <button onClick={() => setLogModal(null)} disabled={logModal.running} className="ml-auto disabled:opacity-20">
                  <X size={16} />
                </button>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded opacity-10 blur group-hover:opacity-20 transition duration-1000"></div>
                <div className="relative bg-black rounded p-4 font-mono text-[11px] leading-relaxed overflow-auto max-h-[400px] custom-scrollbar border border-white/5">
                  {logModal.content.split('\n').map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-white/10 select-none w-4">{i + 1}</span>
                      <span className={line.startsWith('[system]') ? 'text-cyan-400 font-bold' : 'text-white/60'}>
                        {line}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>

              {!logModal.running && (
                <div className="mt-4 flex justify-end">
                  <button onClick={() => setLogModal(null)} 
                    className={`btn-${logModal.success ? 'primary' : 'danger'} text-xs px-6 py-2`}>
                    Close Log
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
