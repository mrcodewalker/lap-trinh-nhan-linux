import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Search, Trash2, Download, RefreshCw, X, Terminal, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../../utils/api'

export default function PackageManager() {
  const [packages, setPackages]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [installPkg, setInstallPkg] = useState('')
  const [busy, setBusy]           = useState(null) // pkg name being processed
  const [output, setOutput]       = useState(null) // { title, text, success }
  const [searchResults, setSearchResults] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => { loadPackages() }, [])

  const loadPackages = async () => {
    setLoading(true); setError(null)
    try {
      const r = await api.get('/shell/packages/list')
      setPackages(r.data.packages || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load packages')
    } finally { setLoading(false) }
  }

  const install = async () => {
    if (!installPkg.trim()) return
    setBusy(installPkg)
    try {
      const r = await api.post('/shell/packages/install', { package: installPkg })
      setOutput({ title: `Install: ${installPkg}`, text: r.data.output || r.data.message, success: r.data.success })
      setInstallPkg('')
      loadPackages()
    } catch (e) {
      setOutput({ title: `Install: ${installPkg}`, text: e.response?.data?.error || 'Failed', success: false })
    } finally { setBusy(null) }
  }

  const remove = async (pkg) => {
    if (!confirm(`Remove package "${pkg}"?`)) return
    setBusy(pkg)
    try {
      const r = await api.post('/shell/packages/remove', { package: pkg })
      setOutput({ title: `Remove: ${pkg}`, text: r.data.output || r.data.message, success: r.data.success })
      loadPackages()
    } catch (e) {
      setOutput({ title: `Remove: ${pkg}`, text: e.response?.data?.error || 'Failed', success: false })
    } finally { setBusy(null) }
  }

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
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Install Package</p>
        <div className="flex gap-2">
          <input value={installPkg} onChange={e => setInstallPkg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && install()}
            placeholder="e.g. nginx, curl, git..." className="input flex-1" />
          <button onClick={install} disabled={!!busy || !installPkg.trim()}
            className="btn-primary flex items-center gap-2 px-5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
            {busy === installPkg ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            Install
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="card p-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchApt()}
            placeholder="Filter installed / search apt..." className="input pl-9" />
        </div>
        <button onClick={searchApt} disabled={searching}
          className="btn-ghost flex items-center gap-1.5 text-xs whitespace-nowrap">
          {searching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
          Search apt
        </button>
        <button onClick={loadPackages} className="btn-ghost p-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* apt search results */}
      {searchResults && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">apt search results</p>
            <button onClick={() => setSearchResults('')}><X size={13} className="text-white/30" /></button>
          </div>
          <pre className="code-block text-xs max-h-48 overflow-auto">{searchResults}</pre>
        </div>
      )}

      {error && (
        <div className="px-4 py-2.5 rounded-xl text-xs text-red-400 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          {error} <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Package list */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-xs text-white/40">{filtered.length} packages</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-white/30">Loading packages...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/30">No packages found</div>
        ) : (
          <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
            {filtered.map((pkg, i) => (
              <motion.div key={pkg.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.025] transition-colors group">
                <Package size={14} className="text-violet-400/50 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white/80 font-mono">{pkg.name}</span>
                  <span className="text-xs text-white/30 ml-2">{pkg.version}</span>
                </div>
                <span className="text-xs text-white/25 truncate max-w-[200px] hidden md:block">{pkg.description}</span>
                <button onClick={() => remove(pkg.name)} disabled={busy === pkg.name}
                  className="opacity-0 group-hover:opacity-100 btn-danger py-1 px-2.5 text-xs flex items-center gap-1 transition-opacity disabled:opacity-40">
                  {busy === pkg.name ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Output modal */}
      <AnimatePresence>
        {output && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop" onClick={() => setOutput(null)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                {output.success
                  ? <CheckCircle size={18} className="text-emerald-400" />
                  : <AlertCircle size={18} className="text-red-400" />
                }
                <h3 className="font-semibold text-white text-sm">{output.title}</h3>
                <button onClick={() => setOutput(null)} className="ml-auto"><X size={16} className="text-white/40" /></button>
              </div>
              <pre className="code-block text-xs max-h-64 overflow-auto whitespace-pre-wrap">{output.text}</pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
