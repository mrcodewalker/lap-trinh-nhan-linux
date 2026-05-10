import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, Upload, Download, RefreshCw, CheckCircle,
  AlertCircle, X, Zap, FolderOpen, Trash2, Terminal,
  ChevronRight, Info, Package
} from 'lucide-react'
import api from '../../utils/api'
import { useSocketStore } from '../../store/socketStore'

// ── Inline templates (fallback if server samples unavailable) ──────────────
const BUILTIN = {
  hello: {
    label: 'Hello World',
    modName: 'hello_module',
    desc: 'Basic init/exit, printk, module params',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Hello World Kernel Module");
MODULE_VERSION("1.0");

static char *greeting = "Hello";
module_param(greeting, charp, 0444);
MODULE_PARM_DESC(greeting, "Greeting string (default: Hello)");

static int __init hello_init(void) {
    printk(KERN_INFO "hello_module: %s from kernel!\\n", greeting);
    return 0;
}

static void __exit hello_exit(void) {
    printk(KERN_INFO "hello_module: unloaded\\n");
}

module_init(hello_init);
module_exit(hello_exit);`,
  },
  proc: {
    label: 'Proc FS',
    modName: 'proc_module',
    desc: 'Create /proc entry, seq_file read/write',
    code: null, // loaded from server
  },
  timer: {
    label: 'Kernel Timer',
    modName: 'timer_module',
    desc: 'Periodic timer callback, workqueue',
    code: null,
  },
  chardev: {
    label: 'Char Device',
    modName: 'chardev_module',
    desc: 'Character device driver, ring buffer',
    code: null,
  },
}

// ── Log line color ─────────────────────────────────────────────────────────
const logColor = (level) => {
  if (level === 'error')   return 'var(--red)'
  if (level === 'warn')    return 'var(--yellow)'
  if (level === 'success') return 'var(--green)'
  return 'var(--text2)'
}

export default function KernelBuilder() {
  const { socket, on, off, emit } = useSocketStore()

  // Editor state
  const [code, setCode]         = useState(BUILTIN.hello.code)
  const [modName, setModName]   = useState(BUILTIN.hello.modName)
  const [autoLoad, setAutoLoad] = useState(false)
  const [activeKey, setActiveKey] = useState('hello')

  // Server samples
  const [serverSamples, setServerSamples] = useState([])
  const [showSamples, setShowSamples]     = useState(false)

  // Build state
  const [building, setBuilding]   = useState(false)
  const [buildLogs, setBuildLogs] = useState([])   // { line, level }
  const [buildResult, setBuildResult] = useState(null) // { success, koFile, loaded, error }
  const [sessionId, setSessionId] = useState(null)

  // dmesg watch
  const [dmesgLines, setDmesgLines] = useState([])
  const [watchingDmesg, setWatchingDmesg] = useState(false)

  const logsEndRef  = useRef(null)
  const dmesgEndRef = useRef(null)

  // Auto-scroll logs
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [buildLogs])
  useEffect(() => { dmesgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [dmesgLines])

  // Load server samples list
  useEffect(() => {
    api.get('/kernel/samples')
      .then(r => setServerSamples(r.data.samples || []))
      .catch(() => {})
  }, [])

  // Socket listeners for compile streaming
  useEffect(() => {
    if (!socket) return

    const onLog  = (d) => setBuildLogs(prev => [...prev, { line: d.line, level: d.level }])
    const onDone = (d) => { setBuilding(false); setBuildResult(d) }
    const onDmesg = (d) => setDmesgLines(prev => [...prev.slice(-199), d.line])

    on('kernel:compile:log',  onLog)
    on('kernel:compile:done', onDone)
    on('kernel:dmesg:line',   onDmesg)

    return () => {
      off('kernel:compile:log')
      off('kernel:compile:done')
      off('kernel:dmesg:line')
    }
  }, [socket])

  // Load a server sample by name
  const loadServerSample = async (name) => {
    try {
      const r = await api.get(`/kernel/sample/${name}`)
      setCode(r.data.code)
      setModName(name)
      setActiveKey(null)
      setBuildLogs([])
      setBuildResult(null)
      setShowSamples(false)
    } catch { /* silent */ }
  }

  // Apply builtin template (may need server fetch for non-hello)
  const applyBuiltin = async (key) => {
    const t = BUILTIN[key]
    setActiveKey(key)
    setModName(t.modName)
    setBuildLogs([])
    setBuildResult(null)

    if (t.code) {
      setCode(t.code)
    } else {
      // fetch from server samples
      try {
        const r = await api.get(`/kernel/sample/${t.modName}`)
        setCode(r.data.code)
      } catch {
        setCode(`/* Could not load ${t.modName}.c from server.\n   Make sure kernel-samples/ directory exists. */`)
      }
    }
  }

  // Start compile
  const compile = () => {
    if (!code.trim() || !modName.trim() || building) return
    const sid = Date.now().toString()
    setSessionId(sid)
    setBuildLogs([])
    setBuildResult(null)
    setBuilding(true)
    emit('kernel:compile', { code, moduleName: modName, autoLoad, sessionId: sid })
  }

  // Load .ko manually after build
  const loadModule = async () => {
    if (!buildResult?.koFile) return
    try {
      await api.post('/kernel/insmod', { module: buildResult.koFile })
      setBuildResult(r => ({ ...r, loaded: true }))
      setBuildLogs(prev => [...prev, { line: `[ok] Module loaded into kernel`, level: 'success' }])
    } catch (e) {
      setBuildLogs(prev => [...prev, { line: `[error] ${e.response?.data?.error || 'insmod failed'}`, level: 'error' }])
    }
  }

  // Unload module
  const unloadModule = async () => {
    try {
      await api.post('/kernel/rmmod', { module: modName })
      setBuildResult(r => ({ ...r, loaded: false }))
      setBuildLogs(prev => [...prev, { line: `[ok] Module unloaded`, level: 'success' }])
    } catch (e) {
      setBuildLogs(prev => [...prev, { line: `[error] ${e.response?.data?.error || 'rmmod failed'}`, level: 'error' }])
    }
  }

  // Toggle dmesg watch
  const toggleDmesg = () => {
    if (watchingDmesg) {
      emit('kernel:dmesg:stop')
      setWatchingDmesg(false)
    } else {
      setDmesgLines([])
      emit('kernel:dmesg:watch')
      setWatchingDmesg(true)
    }
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${modName}.c`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">

      {/* ── LEFT: Editor ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 min-h-0">

        {/* Template picker */}
        <div className="card p-3">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>
            Templates
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(BUILTIN).map(([key, t]) => (
              <button key={key} onClick={() => applyBuiltin(key)}
                className="p-2.5 rounded-xl text-left transition-all"
                style={activeKey === key ? {
                  background: 'rgba(34,211,238,0.08)',
                  border: '1px solid rgba(34,211,238,0.25)',
                } : {
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}>
                <p className="text-xs font-semibold" style={{ color: activeKey === key ? 'var(--accent)' : 'var(--text)' }}>
                  {t.label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{t.desc}</p>
              </button>
            ))}
          </div>

          {/* Server samples dropdown */}
          {serverSamples.length > 0 && (
            <div className="relative mt-2">
              <button onClick={() => setShowSamples(v => !v)}
                className="btn-ghost w-full flex items-center gap-2 text-xs justify-center">
                <FolderOpen size={13} /> Load from kernel-samples/
              </button>
              <AnimatePresence>
                {showSamples && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-full left-0 right-0 mt-1 z-20 card p-2 space-y-1">
                    {serverSamples.map(s => (
                      <button key={s.name} onClick={() => loadServerSample(s.name)}
                        className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                        style={{ color: 'var(--text2)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Package size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <div>
                          <p className="text-xs mono" style={{ color: 'var(--accent)' }}>{s.filename}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{s.description}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Module name + options */}
        <div className="card p-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>Name:</label>
            <input value={modName} onChange={e => setModName(e.target.value)}
              className="input py-1.5 text-xs mono flex-1" placeholder="module_name" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <input type="checkbox" checked={autoLoad} onChange={e => setAutoLoad(e.target.checked)}
              className="w-3.5 h-3.5 accent-cyan-400" />
            <span className="text-xs" style={{ color: 'var(--text3)' }}>Auto-load</span>
          </label>
        </div>

        {/* Code editor */}
        <div className="terminal-wrap flex-1 flex flex-col min-h-0" style={{ minHeight: 320 }}>
          <div className="terminal-header flex-shrink-0">
            <span className="terminal-dot bg-red-400/60" />
            <span className="terminal-dot bg-yellow-400/60" />
            <span className="terminal-dot bg-green-400/60" />
            <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>{modName}.c</span>
            <span className="ml-auto text-[10px]" style={{ color: 'var(--text3)' }}>
              {code.split('\n').length} lines
            </span>
          </div>
          <textarea value={code} onChange={e => setCode(e.target.value)}
            className="flex-1 p-4 mono text-xs outline-none resize-none leading-relaxed"
            style={{ background: 'var(--code-bg)', color: 'var(--code-text)', caretColor: 'var(--accent)', minHeight: 280 }}
            spellCheck={false} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={compile} disabled={building || !code.trim()}
            className="btn-primary flex items-center gap-2 flex-1 justify-center">
            {building
              ? <><RefreshCw size={14} className="animate-spin" /> Compiling...</>
              : <><Play size={14} /> Compile{autoLoad ? ' & Load' : ''}</>
            }
          </button>
          <button onClick={downloadCode} className="btn-ghost flex items-center gap-2">
            <Download size={14} /> .c
          </button>
          <button onClick={() => { setCode(''); setBuildLogs([]); setBuildResult(null) }}
            className="btn-ghost p-2" style={{ color: 'var(--red)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── RIGHT: Build output + dmesg ──────────────────────── */}
      <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">

        {/* Build log panel */}
        <div className="card flex flex-col" style={{ minHeight: 280, maxHeight: 380 }}>
          <div className="terminal-header flex-shrink-0">
            <span className="terminal-dot bg-red-400/60" />
            <span className="terminal-dot bg-yellow-400/60" />
            <span className="terminal-dot bg-green-400/60" />
            <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>build output</span>
            {building && <RefreshCw size={11} className="ml-auto animate-spin" style={{ color: 'var(--accent)' }} />}
            {buildResult && !building && (
              <span className="ml-auto flex items-center gap-1 text-xs"
                style={{ color: buildResult.success ? 'var(--green)' : 'var(--red)' }}>
                {buildResult.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {buildResult.success ? 'OK' : 'FAILED'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 mono text-xs space-y-px"
            style={{ background: 'var(--code-bg)' }}>
            {buildLogs.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text3)' }}>
                Press Compile to start build
              </p>
            ) : (
              buildLogs.map((l, i) => (
                <div key={i} className="leading-relaxed" style={{ color: logColor(l.level) }}>
                  {l.line}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Post-build actions */}
        <AnimatePresence>
          {buildResult && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                {buildResult.success
                  ? <CheckCircle size={15} style={{ color: 'var(--green)' }} />
                  : <AlertCircle size={15} style={{ color: 'var(--red)' }} />
                }
                <span className="text-sm font-semibold"
                  style={{ color: buildResult.success ? 'var(--green)' : 'var(--red)' }}>
                  {buildResult.success
                    ? buildResult.loaded ? `✓ Loaded: ${modName}` : `✓ Built: ${modName}.ko`
                    : `✗ Build failed`
                  }
                </span>
                {buildResult.loaded && (
                  <span className="badge badge-green text-[10px] ml-1">
                    <Zap size={9} className="inline" /> Active in kernel
                  </span>
                )}
              </div>

              {buildResult.koFile && (
                <p className="text-xs mono" style={{ color: 'var(--text3)' }}>
                  {buildResult.koFile}
                </p>
              )}

              {buildResult.success && (
                <div className="flex gap-2 flex-wrap">
                  {!buildResult.loaded ? (
                    <button onClick={loadModule}
                      className="btn-primary flex items-center gap-2 text-sm">
                      <Zap size={13} /> insmod — Load into kernel
                    </button>
                  ) : (
                    <button onClick={unloadModule}
                      className="btn-danger flex items-center gap-2 text-sm">
                      <Square size={13} /> rmmod — Unload
                    </button>
                  )}
                  <button onClick={toggleDmesg}
                    className="btn-ghost flex items-center gap-2 text-sm"
                    style={watchingDmesg ? { color: 'var(--accent)', borderColor: 'rgba(34,211,238,0.3)' } : {}}>
                    <Terminal size={13} />
                    {watchingDmesg ? 'Stop dmesg' : 'Watch dmesg'}
                  </button>
                </div>
              )}

              {buildResult.success && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface)', color: 'var(--text3)' }}>
                  💡 After loading, run <span className="mono" style={{ color: 'var(--accent)' }}>dmesg | tail -5</span> to see module output
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* dmesg live panel */}
        <AnimatePresence>
          {(watchingDmesg || dmesgLines.length > 0) && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card flex flex-col flex-1" style={{ minHeight: 160, maxHeight: 260 }}>
              <div className="terminal-header flex-shrink-0">
                <span className="terminal-dot bg-red-400/60" />
                <span className="terminal-dot bg-yellow-400/60" />
                <span className="terminal-dot bg-green-400/60" />
                <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>dmesg -w</span>
                {watchingDmesg && (
                  <span className="ml-2 flex items-center gap-1 text-[10px]" style={{ color: 'var(--green)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    live
                  </span>
                )}
                <button onClick={toggleDmesg} className="ml-auto p-1 rounded"
                  style={{ color: 'var(--text3)' }}>
                  {watchingDmesg ? <Square size={11} /> : <X size={11} />}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 mono text-xs space-y-px"
                style={{ background: 'var(--code-bg)' }}>
                {dmesgLines.length === 0 ? (
                  <p style={{ color: 'var(--text3)' }}>Waiting for kernel messages...</p>
                ) : (
                  dmesgLines.map((line, i) => {
                    const color = line.toLowerCase().includes('error') ? 'var(--red)'
                                : line.toLowerCase().includes('warn')  ? 'var(--yellow)'
                                : 'var(--green)'
                    return <div key={i} style={{ color }}>{line}</div>
                  })
                )}
                <div ref={dmesgEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
