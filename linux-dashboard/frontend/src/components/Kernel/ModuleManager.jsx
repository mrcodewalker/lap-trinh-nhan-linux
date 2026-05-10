import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Trash2, Info, X, AlertTriangle, Upload,
  Cpu, CheckCircle, AlertCircle, Search, Zap, Package
} from 'lucide-react'
import api from '../../utils/api'

export default function ModuleManager() {
  const [modules, setModules]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(null)
  const [modInfo, setModInfo]       = useState('')
  const [loadPath, setLoadPath]     = useState('')
  const [loadParams, setLoadParams] = useState('')
  const [busy, setBusy]             = useState(null)
  const [opResult, setOpResult]     = useState(null)
  const [kernelVer, setKernelVer]   = useState('')

  useEffect(() => {
    loadModules()
    loadKernelVer()
    const t = setInterval(loadModules, 4000)
    return () => clearInterval(t)
  }, [])

  const loadModules = async () => {
    setLoading(true)
    try {
      const r = await api.get('/kernel/modules')
      setModules(r.data.modules || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load modules')
    } finally {
      setLoading(false)
    }
  }

  const loadKernelVer = async () => {
    try {
      const r = await api.get('/kernel/version')
      setKernelVer(r.data.version)
    } catch { /* silent */ }
  }

  const getInfo = async (name) => {
    setModInfo('Loading...')
    try {
      const r = await api.get('/kernel/module-info', { params: { module: name } })
      setModInfo(r.data.info || 'No info available')
    } catch {
      setModInfo('modinfo not available for this module')
    }
  }

  const unload = async (name) => {
    setBusy(name)
    setOpResult(null)
    try {
      await api.post('/kernel/rmmod', { module: name })
      setOpResult({ success: true, msg: `Module "${name}" unloaded successfully` })
      loadModules()
    } catch (e) {
      setOpResult({ success: false, msg: e.response?.data?.error || 'Failed to unload' })
    } finally {
      setBusy(null)
    }
  }

  const loadModule = async () => {
    if (!loadPath.trim()) return
    setBusy('loading')
    setOpResult(null)
    try {
      await api.post('/kernel/insmod', { module: loadPath, params: loadParams })
      setOpResult({ success: true, msg: `Module loaded from ${loadPath}` })
      setModal(null)
      setLoadPath('')
      setLoadParams('')
      loadModules()
    } catch (e) {
      setOpResult({ success: false, msg: e.response?.data?.error || 'Failed to load module' })
    } finally {
      setBusy(null)
    }
  }

  const filtered = modules.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3">
          <p className="text-xs text-white/30 mb-1">Loaded Modules</p>
          <p className="text-2xl font-bold text-cyan-400">{modules.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-white/30 mb-1">Kernel Version</p>
          <p className="text-sm font-mono text-violet-400 truncate">{kernelVer || '...'}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-white/30 mb-1">In Use</p>
          <p className="text-2xl font-bold text-emerald-400">
            {modules.filter(m => m.usedBy !== 'unused' && m.usedBy !== '0').length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search modules..."
            className="input pl-9 py-2"
          />
        </div>
        <button
          onClick={() => { setModal({ type: 'load' }); setOpResult(null) }}
          className="btn-primary flex items-center gap-1.5 text-sm"
        >
          <Upload size={13} /> Load Module
        </button>
        <button onClick={loadModules} className="btn-ghost p-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs text-white/30">{filtered.length} modules</span>
      </div>

      {/* Op result banner */}
      <AnimatePresence>
        {opResult && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 ${
              opResult.success
                ? 'text-emerald-400 border border-emerald-500/15'
                : 'text-red-400 border border-red-500/15'
            }`}
            style={{
              background: opResult.success
                ? 'rgba(52,211,153,0.08)'
                : 'rgba(239,68,68,0.08)'
            }}
          >
            {opResult.success ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {opResult.msg}
            <button onClick={() => setOpResult(null)} className="ml-auto">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {error && (
        <div
          className="px-4 py-2.5 rounded-xl text-xs text-red-400 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Module Name</th>
                <th>Size</th>
                <th>Used By</th>
                <th>Dependencies</th>
                <th className="text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 40).map((mod, i) => (
                <motion.tr
                  key={mod.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.008, 0.3) }}
                  className="group cursor-pointer"
                  onClick={() => { setModal({ type: 'info', data: mod }); getInfo(mod.name) }}
                >
                  <td>
                    <div className="flex items-center gap-2">
                      <Package size={13} className="text-cyan-400/50 flex-shrink-0" />
                      <span className="font-mono text-cyan-400/90 font-medium">{mod.name}</span>
                    </div>
                  </td>
                  <td className="text-white/45 text-xs font-mono">{mod.size}</td>
                  <td>
                    <span className={`badge text-[10px] ${
                      mod.usedBy === 'unused' || mod.usedBy === '0'
                        ? 'badge-purple'
                        : 'badge-green'
                    }`}>
                      {mod.usedBy === '0' ? 'unused' : mod.usedBy}
                    </span>
                  </td>
                  <td className="text-white/30 text-xs truncate max-w-[160px]">
                    {mod.dependencies || '—'}
                  </td>
                  <td className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setModal({ type: 'info', data: mod }); getInfo(mod.name) }}
                        className="p-1.5 rounded-lg hover:bg-cyan-500/15 text-cyan-400/50 hover:text-cyan-400 transition-colors"
                      >
                        <Info size={12} />
                      </button>
                      <button
                        onClick={() => { setModal({ type: 'unload', data: mod }); setOpResult(null) }}
                        disabled={busy === mod.name}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {busy === mod.name
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <Trash2 size={12} />
                        }
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !loading && (
          <div className="py-12 text-center">
            <Cpu size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-xs text-white/30">No modules found</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="modal-box max-w-lg"
              onClick={e => e.stopPropagation()}
            >

              {/* ── Module info ── */}
              {modal.type === 'info' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}
                      >
                        <Cpu size={16} className="text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm font-mono">{modal.data.name}</p>
                        <p className="text-xs text-white/30">{modal.data.size} bytes</p>
                      </div>
                    </div>
                    <button onClick={() => setModal(null)}>
                      <X size={16} className="text-white/30" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      ['Size',    modal.data.size + ' B'],
                      ['Used By', modal.data.usedBy],
                      ['Deps',    modal.data.dependencies || 'none'],
                    ].map(([k, v]) => (
                      <div key={k} className="card p-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">{k}</p>
                        <p className="text-xs font-mono text-white/70 mt-0.5 truncate">{v}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">modinfo</p>
                  <pre className="code-block text-xs max-h-52 overflow-auto">{modInfo}</pre>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setModal({ type: 'unload', data: modal.data })}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-red-400"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <Trash2 size={13} /> Unload
                    </button>
                    <button onClick={() => setModal(null)} className="btn-ghost flex-1 text-xs">
                      Close
                    </button>
                  </div>
                </>
              )}

              {/* ── Unload confirm ── */}
              {modal.type === 'unload' && (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Unload Module</p>
                      <p className="text-xs text-white/35 font-mono">{modal.data.name}</p>
                    </div>
                    <button onClick={() => setModal(null)} className="ml-auto">
                      <X size={16} className="text-white/30" />
                    </button>
                  </div>

                  <p className="text-xs text-white/40 mb-5">
                    ⚠ Unloading a kernel module may affect system stability or running services that depend on it.
                  </p>

                  <div className="flex gap-2">
                    <button onClick={() => setModal(null)} className="btn-ghost flex-1">Cancel</button>
                    <button
                      onClick={() => { unload(modal.data.name); setModal(null) }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{
                        background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                        boxShadow: '0 4px 15px rgba(239,68,68,0.3)'
                      }}
                    >
                      <Trash2 size={14} /> Unload
                    </button>
                  </div>
                </>
              )}

              {/* ── Load module ── */}
              {modal.type === 'load' && (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
                    >
                      <Upload size={16} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Load Kernel Module</p>
                      <p className="text-xs text-white/35">insmod — direct module loading</p>
                    </div>
                    <button onClick={() => setModal(null)} className="ml-auto">
                      <X size={16} className="text-white/30" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs text-white/35 block mb-1.5">Module path (.ko file)</label>
                      <input
                        value={loadPath}
                        onChange={e => setLoadPath(e.target.value)}
                        className="input mono"
                        placeholder="/path/to/module.ko"
                        onKeyDown={e => e.key === 'Enter' && loadModule()}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/35 block mb-1.5">Parameters (optional)</label>
                      <input
                        value={loadParams}
                        onChange={e => setLoadParams(e.target.value)}
                        className="input mono"
                        placeholder="param1=value1 param2=value2"
                      />
                    </div>
                  </div>

                  <div
                    className="px-4 py-3 rounded-xl text-xs text-yellow-400 flex items-center gap-2 mb-4"
                    style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}
                  >
                    <AlertTriangle size={13} />
                    Loading kernel modules can affect system stability. Use with caution.
                  </div>

                  <AnimatePresence>
                    {opResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`px-4 py-2.5 rounded-xl text-xs mb-4 flex items-center gap-2 ${
                          opResult.success
                            ? 'text-emerald-400 border border-emerald-500/15'
                            : 'text-red-400 border border-red-500/15'
                        }`}
                        style={{
                          background: opResult.success
                            ? 'rgba(52,211,153,0.08)'
                            : 'rgba(239,68,68,0.08)'
                        }}
                      >
                        {opResult.success ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                        {opResult.msg}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    <button onClick={() => setModal(null)} className="btn-ghost flex-1">Cancel</button>
                    <button
                      onClick={loadModule}
                      disabled={!loadPath.trim() || busy === 'loading'}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      {busy === 'loading'
                        ? <RefreshCw size={13} className="animate-spin" />
                        : <Zap size={13} />
                      }
                      Load Module
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
