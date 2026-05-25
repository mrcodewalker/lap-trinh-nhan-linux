import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Trash2, Info, X, AlertTriangle, Upload,
  Cpu, CheckCircle, AlertCircle, Search, Zap, Package, Plus
} from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'

export default function ModuleManager() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [modInfo, setModInfo] = useState('')
  const [loadPath, setLoadPath] = useState('')
  const [loadParams, setLoadParams] = useState('')
  const [busy, setBusy] = useState(null)
  const [opResult, setOpResult] = useState(null)
  const [kernelVer, setKernelVer] = useState('')
  const [devices, setDevices] = useState({ charDevices: [], blockDevices: [] })

  useEffect(() => {
    loadModules()
    loadKernelVer()
    loadDevices()
    const t = setInterval(() => {
      loadModules()
    }, 5000)
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

  const loadDevices = async () => {
    try {
      const r = await api.get('/kernel/proc-devices')
      setDevices(r.data)
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
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="card p-4 border-l-4 border-cyan-500">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Loaded Modules</p>
          <p className="text-3xl font-black text-white">{modules.length}</p>
        </div>
        <div className="card p-4 border-l-4 border-violet-500">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Kernel Version</p>
          <p className="text-sm font-mono text-violet-400 truncate mt-2">{kernelVer || '...'}</p>
        </div>
        <div className="card p-4 border-l-4 border-emerald-500">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Active Modules</p>
          <p className="text-3xl font-black text-white">
            {modules.filter(m => m.usedBy !== 'unused' && m.usedBy !== '0').length}
          </p>
        </div>
        <div className="card p-4 border-l-4 border-amber-500">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Device Nodes</p>
          <p className="text-3xl font-black text-white">{devices.charDevices.length + devices.blockDevices.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0">

        {/* Main List */}
        <div className="xl:col-span-2 space-y-3">
          {/* Toolbar */}
          <div className="card p-3 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search module name..."
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
            <button
              onClick={() => { setModal({ type: 'load' }); setOpResult(null) }}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            >
              <Upload size={14} /> Load Module
            </button>
            <button onClick={loadModules} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Op result banner */}
          <AnimatePresence>
            {opResult && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 ${opResult.success
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

          <div className="card overflow-hidden border-white/5">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0d0e12] z-10">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">Module</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">Size</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filtered.slice(0, 50).map((mod, i) => (
                    <tr key={mod.name}
                      className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => { setModal({ type: 'info', data: mod }); getInfo(mod.name) }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-500/40" />
                          <span className="font-mono text-sm text-cyan-400 font-bold">{mod.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40 font-mono">{(parseInt(mod.size) / 1024).toFixed(1)} KB</td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                          mod.usedBy === '0' || mod.usedBy === 'unused' ? "bg-white/5 text-white/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        )}>
                          {mod.usedBy === '0' ? 'unused' : `${mod.usedBy} users`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setModal({ type: 'unload', data: mod }); setOpResult(null) }}
                          className="p-2 rounded-lg bg-rose-500/5 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/20">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && !loading && (
              <div className="py-20 text-center">
                <Cpu size={32} className="mx-auto text-white/10 mb-3" />
                <p className="text-xs text-white/30">No kernel modules found</p>
              </div>
            )}
          </div>
        </div>

        {/* Major ID Mapping (Right Panel) */}
        <div className="space-y-4">
          <div className="card p-5 bg-gradient-to-br from-white/[0.03] to-transparent">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              Major ID Mapping
            </h3>

            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              <div>
                <p className="text-[10px] font-bold text-white/20 uppercase mb-2 tracking-widest">Character Devices</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {devices.charDevices.map(dev => (
                    <div key={`${dev.major}-${dev.name}`} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 group hover:border-amber-500/30 transition-all">
                      <span className="text-xs font-mono text-amber-400/80 group-hover:text-amber-400 font-bold">{dev.major}</span>
                      <span className="text-xs text-white/60 font-mono">{dev.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-white/20 uppercase mb-2 tracking-widest">Block Devices</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {devices.blockDevices.map(dev => (
                    <div key={`${dev.major}-${dev.name}`} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 group hover:border-cyan-500/30 transition-all">
                      <span className="text-xs font-mono text-cyan-400/80 group-hover:text-cyan-400 font-bold">{dev.major}</span>
                      <span className="text-xs text-white/60 font-mono">{dev.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
                      ['Size', modal.data.size + ' B'],
                      ['Used By', modal.data.usedBy],
                      ['Deps', modal.data.dependencies || 'none'],
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
                        className={`px-4 py-2.5 rounded-xl text-xs mb-4 flex items-center gap-2 ${opResult.success
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
