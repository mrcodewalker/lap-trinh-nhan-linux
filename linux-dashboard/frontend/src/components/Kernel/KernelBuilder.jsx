import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, Upload, Download, RefreshCw, CheckCircle,
  AlertCircle, X, Zap, FolderOpen, Trash2, Terminal,
  ChevronRight, Info, Package, Cpu, Code2, Save
} from 'lucide-react'
import api from '../../utils/api'
import { useSocketStore } from '../../store/socketStore'
import { clsx } from 'clsx'

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
  proc_list: {
    label: 'Process List',
    modName: 'proc_list_module',
    desc: 'Iterate all processes in kernel space',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/sched.h>
#include <linux/sched/signal.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");

static int __init plist_init(void) {
    struct task_struct *task;
    printk(KERN_INFO "plist: Listing all processes:\\n");
    for_each_process(task) {
        printk(KERN_INFO "plist: [%d] %s\\n", task->pid, task->comm);
    }
    return 0;
}

static void __exit plist_exit(void) {
    printk(KERN_INFO "plist: unloaded\\n");
}

module_init(plist_init);
module_exit(plist_exit);`,
  },
}

export default function KernelBuilder() {
  const { socket, on, off, emit } = useSocketStore()

  // Editor state
  const [code, setCode]         = useState(BUILTIN.hello.code)
  const [modName, setModName]   = useState(BUILTIN.hello.modName)
  const [autoLoad, setAutoLoad] = useState(false)
  const [activeKey, setActiveKey] = useState('hello')

  // Build state
  const [building, setBuilding]   = useState(false)
  const [buildLogs, setBuildLogs] = useState([])   // { line, level }
  const [buildResult, setBuildResult] = useState(null)
  const [moduleLoaded, setModuleLoaded] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)

  // dmesg watch
  const [dmesgLines, setDmesgLines] = useState([])
  const [watchingDmesg, setWatchingDmesg] = useState(false)

  const logsEndRef  = useRef(null)
  const dmesgEndRef = useRef(null)

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [buildLogs])
  useEffect(() => { dmesgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [dmesgLines])

  // Socket listeners
  useEffect(() => {
    if (!socket) return
    const onLog  = (d) => setBuildLogs(prev => [...prev, { line: d.line, level: d.level }])
    const onDone = (d) => { setBuilding(false); setBuildResult(d); if(d.success) checkModuleLoaded(modName) }
    const onDmesg = (d) => setDmesgLines(prev => [...prev.slice(-100), d.line])

    on('kernel:compile:log',  onLog)
    on('kernel:compile:done', onDone)
    on('kernel:dmesg:line',   onDmesg)

    return () => {
      off('kernel:compile:log'); off('kernel:compile:done'); off('kernel:dmesg:line')
    }
  }, [socket, modName])

  const applyBuiltin = (key) => {
    const t = BUILTIN[key]
    setActiveKey(key); setModName(t.modName); setCode(t.code); setBuildLogs([]); setBuildResult(null)
  }

  const compile = () => {
    if (!code.trim() || !modName.trim() || building) return
    setBuildLogs([]); setBuildResult(null); setBuilding(true)
    emit('kernel:compile', { code, moduleName: modName, autoLoad, sessionId: Date.now().toString() })
  }

  const checkModuleLoaded = async (name) => {
    try {
      const r = await api.get('/kernel/modules')
      const loaded = (r.data.modules || []).some(m => m.name === name)
      setModuleLoaded(loaded)
    } catch { /* silent */ }
  }

  const loadModule = async () => {
    if (!buildResult?.koFile) return
    setLoadingAction(true)
    try {
      await api.post('/kernel/insmod', { module: buildResult.koFile })
      setModuleLoaded(true)
      setBuildLogs(prev => [...prev, { line: `[ok] Module loaded into kernel`, level: 'success' }])
    } catch (e) {
      setBuildLogs(prev => [...prev, { line: `[error] ${e.response?.data?.error || 'insmod failed'}`, level: 'error' }])
    } finally { setLoadingAction(false) }
  }

  const unloadModule = async () => {
    setLoadingAction(true)
    try {
      await api.post('/kernel/rmmod', { module: modName })
      setModuleLoaded(false)
      setBuildLogs(prev => [...prev, { line: `[ok] Module unloaded`, level: 'success' }])
    } catch (e) {
      setBuildLogs(prev => [...prev, { line: `[error] ${e.response?.data?.error || 'rmmod failed'}`, level: 'error' }])
    } finally { setLoadingAction(false) }
  }

  const toggleDmesg = () => {
    if (watchingDmesg) {
      emit('kernel:dmesg:stop'); setWatchingDmesg(false)
    } else {
      setDmesgLines([]); emit('kernel:dmesg:watch'); setWatchingDmesg(true)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full max-h-[calc(100vh-180px)] overflow-hidden">
      
      {/* Sidebar: Templates & Config */}
      <div className="lg:col-span-3 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        <div className="card p-5 space-y-4 border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Kernel Templates</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(BUILTIN).map(([key, t]) => (
              <button key={key} onClick={() => applyBuiltin(key)}
                className={clsx(
                  "w-full p-4 rounded-2xl text-left border transition-all group",
                  activeKey === key ? "bg-cyan-500/10 border-cyan-500/30" : "bg-black/20 border-white/5 hover:border-white/10"
                )}>
                <p className={clsx("text-xs font-bold", activeKey === key ? "text-cyan-400" : "text-white/60 group-hover:text-white")}>{t.label}</p>
                <p className="text-[10px] text-white/30 mt-1 line-clamp-1">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 space-y-4 border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Module Config</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-white/20 uppercase block mb-1.5 ml-1">Symbol Name</label>
              <input value={modName} onChange={e => setModName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-cyan-400 outline-none focus:border-cyan-500/50" />
            </div>
            <label className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5 cursor-pointer group">
              <div className={clsx("w-4 h-4 rounded border flex items-center justify-center transition-all", autoLoad ? "bg-cyan-500 border-cyan-500" : "border-white/20 group-hover:border-white/40")}>
                {autoLoad && <Check size={10} className="text-black" />}
              </div>
              <input type="checkbox" className="hidden" checked={autoLoad} onChange={e => setAutoLoad(e.target.checked)} />
              <span className="text-xs text-white/40 font-bold uppercase tracking-tighter">Auto-load into kernel</span>
            </label>
          </div>
        </div>
      </div>

      {/* Editor & Console Area */}
      <div className="lg:col-span-9 flex flex-col gap-4 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="flex items-center justify-between px-6 py-3 bg-white/[0.03] border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
              <span className="text-[10px] font-bold font-mono text-white/20 uppercase tracking-widest">{modName}.c</span>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={compile} disabled={building}
                 className="flex items-center gap-2 px-6 py-2 rounded-xl bg-cyan-500 text-black text-[11px] font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50">
                 {building ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                 {building ? 'BUILDING...' : 'RUN MODULE'}
               </button>
            </div>
          </div>
          
          <textarea 
            value={code} onChange={e => setCode(e.target.value)}
            className="flex-1 w-full bg-transparent p-8 font-mono text-sm text-cyan-400/90 outline-none resize-none leading-relaxed no-scrollbar"
            spellCheck={false}
          />
          
          {/* Floating Action Overlay */}
          <div className="absolute right-6 bottom-6 flex gap-2">
            <button className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white/40 hover:text-white transition-all backdrop-blur-md">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Output Tabs (Build Logs / Dmesg) */}
        <div className="h-64 bg-black/40 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-6 py-2 bg-white/[0.03] border-b border-white/5">
            <div className="flex gap-6">
              <button className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 border-b-2 border-cyan-500 pb-1 pt-1">Build Console</button>
              <button onClick={toggleDmesg} className={clsx("text-[10px] font-bold uppercase tracking-widest transition-all pb-1 pt-1", watchingDmesg ? "text-green-400 border-b-2 border-green-500" : "text-white/20 hover:text-white/40")}>Kernel Log (dmesg)</button>
            </div>
            {moduleLoaded && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] font-bold text-green-400 uppercase">ACTIVE IN KERNEL</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-5 font-mono text-[11px] leading-relaxed custom-scrollbar">
            {watchingDmesg ? (
              dmesgLines.length === 0 ? <p className="text-white/10">Waiting for dmesg stream...</p> :
              dmesgLines.map((line, i) => (
                <div key={i} className="text-emerald-400/70 border-l border-emerald-500/20 pl-3 mb-0.5">{line}</div>
              ))
            ) : (
              buildLogs.length === 0 ? <p className="text-white/10">Ready for compilation output.</p> :
              buildLogs.map((l, i) => (
                <div key={i} className={clsx(
                  "pl-3 border-l",
                  l.level === 'error' ? "text-red-400 border-red-500/30" : 
                  l.level === 'success' ? "text-green-400 border-green-500/30" : "text-white/40 border-white/10"
                )}>{l.line}</div>
              ))
            )}
            <div ref={logsEndRef} />
            <div ref={dmesgEndRef} />
          </div>
          
          <div className="px-6 py-2 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
             <div className="flex gap-4">
               {buildResult?.success && (
                 <>
                   {!moduleLoaded ? (
                     <button onClick={loadModule} className="text-[10px] font-bold text-cyan-400 hover:underline uppercase tracking-tighter">Load .ko</button>
                   ) : (
                     <button onClick={unloadModule} className="text-[10px] font-bold text-red-400 hover:underline uppercase tracking-tighter">Unload Module</button>
                   )}
                 </>
               )}
             </div>
             <p className="text-[9px] font-bold text-white/10 uppercase">System Ready</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Check(props) {
  return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
