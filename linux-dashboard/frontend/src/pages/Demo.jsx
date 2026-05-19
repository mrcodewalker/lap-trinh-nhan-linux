/**
 * Demo Scenarios page — chạy thật các kịch bản Linux Programming.
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │  Scenario list   │   Output console  │
 *   │  + Run button    │   + Architecture  │
 *   │                  │   + Explain       │
 *   └──────────────────────────────────────┘
 */
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Square, RefreshCw, Zap, Cpu, Network, FolderOpen, Activity } from 'lucide-react'
import api from '../utils/api'
import { useSocketStore } from '../store/socketStore'
import { ExplainCard } from '../components/Explain/ExplainPanel'
import ArchitectureFlow from '../components/Explain/ArchitectureFlow'
import ActivityLog from '../components/ActivityLog/ActivityLog'

const CATEGORY_ICON = {
  process: Activity,
  ipc:     FolderOpen,
  network: Network,
  kernel:  Cpu,
}

const FLOW_FOR_CATEGORY = {
  process: 'syscall',
  ipc:     'syscall',
  network: 'socket',
  kernel:  'module',
}

export default function Demo() {
  const { socket, on, off, emit, connected } = useSocketStore()
  const [scenarios, setScenarios]     = useState([])
  const [host, setHost]               = useState('linux')
  const [active, setActive]           = useState(null)
  const [running, setRunning]         = useState(false)
  const [lines, setLines]             = useState([])
  const [explain, setExplain]         = useState(null)
  const sidRef = useRef(null)
  const bottomRef = useRef(null)

  /* fetch scenario list */
  useEffect(() => {
    api.get('/demo/scenarios').then(r => {
      setScenarios(r.data.scenarios || [])
      setHost(r.data.host)
      if (r.data.scenarios?.[0]) setActive(r.data.scenarios[0])
    }).catch(() => {})
  }, [])

  /* socket listeners */
  useEffect(() => {
    if (!socket) return

    const onLine = (d) => {
      if (d.sid !== sidRef.current) return
      setLines(prev => [...prev.slice(-499), { line: d.line, level: d.level || 'info' }])
    }
    const onDone = (d) => {
      if (d.sid !== sidRef.current) return
      setLines(prev => [...prev, { line: `\n[exit code=${d.code ?? '?'}]`, level: d.code === 0 ? 'success' : 'error' }])
      setRunning(false)
      if (d.explain) setExplain(d.explain)
    }

    on('demo:line', onLine)
    on('demo:done', onDone)
    return () => { off('demo:line'); off('demo:done') }
  }, [socket])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const run = () => {
    if (!active) return
    setLines([])
    setExplain(null)
    setRunning(true)
    sidRef.current = String(Date.now())
    emit('demo:run', { id: active.id, sid: sidRef.current })
  }

  const cancel = () => {
    emit('demo:cancel')
    setRunning(false)
  }

  const grouped = useMemo(() => {
    const g = {}
    for (const s of scenarios) (g[s.category] ||= []).push(s)
    return g
  }, [scenarios])

  const flowKey = active ? FLOW_FOR_CATEGORY[active.category] || 'syscall' : 'syscall'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="flex flex-col h-full p-5 gap-4 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Demo Scenarios</h1>
          <span className="badge badge-purple ml-2">{scenarios.length} flows</span>
          {host !== 'linux' && (
            <span className="badge badge-yellow ml-1">host: {host} · cần Linux</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <button onClick={cancel} className="btn-danger flex items-center gap-1.5">
              <Square size={13} /> Stop
            </button>
          ) : (
            <button onClick={run} disabled={!active || !connected} className="btn-primary flex items-center gap-1.5">
              <Play size={13} /> Run scenario
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: scenario list */}
        <div className="col-span-4 space-y-3 overflow-auto pr-1">
          {Object.entries(grouped).map(([cat, list]) => {
            const Icon = CATEGORY_ICON[cat] || Cpu
            return (
              <div key={cat} className="card p-3 space-y-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold"
                     style={{ color: 'var(--accent)' }}>
                  <Icon size={11} /> {cat}
                </div>
                {list.map(s => {
                  const isActive = active?.id === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setActive(s); setExplain(s.explain || null) }}
                      className="w-full text-left rounded-lg px-3 py-2 transition-all"
                      style={isActive ? {
                        background: 'linear-gradient(135deg,#06b6d422,#8b5cf622)',
                        border: '1px solid rgba(34,211,238,0.4)',
                      } : {
                        background: 'var(--surface)',
                        border: '1px solid var(--border2)',
                      }}
                    >
                      <div className="text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>{s.title}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{s.explain?.summary}</div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Right: terminal output + explain */}
        <div className="col-span-8 flex flex-col min-h-0 gap-3">
          {/* Terminal */}
          <div className="card flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="terminal-header">
              <span className="terminal-dot bg-red-400/60" />
              <span className="terminal-dot bg-yellow-400/60" />
              <span className="terminal-dot bg-green-400/60" />
              <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>
                {active ? active.title : 'select a scenario'}
              </span>
              {running && (
                <span className="ml-3 flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RUNNING
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto p-3 mono text-[12px] leading-relaxed"
                 style={{ background: 'var(--code-bg)' }}>
              {lines.length === 0 && (
                <div className="opacity-30 flex flex-col items-center justify-center h-full">
                  <RefreshCw size={28} className="mb-2" />
                  <p>Press <kbd>Run scenario</kbd> để chạy thật trên Linux.</p>
                </div>
              )}
              {lines.map((l, i) => (
                <div key={i} style={{ color: levelColor(l.level), whiteSpace: 'pre-wrap' }}>
                  {l.line}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Explain + Architecture */}
          <div className="grid grid-cols-2 gap-3">
            <ExplainCard data={explain || active?.explain} concept={active?.title} />
            <ArchitectureFlow scenario={flowKey} />
          </div>

          {/* Activity log scoped to demo runs */}
          <ActivityLog scope="demo" title="Demo runs · executed commands" height={180} />
        </div>
      </div>
    </motion.div>
  )
}

function levelColor(level) {
  switch (level) {
    case 'error':   return 'var(--red)'
    case 'warn':    return 'var(--yellow)'
    case 'success': return 'var(--green)'
    default:        return 'var(--text2)'
  }
}
