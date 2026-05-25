/**
 * <ActivityLog scope="files" title="File operations log" />
 *
 * Mini-terminal panel hiển thị mọi command mà backend đã thực thi (qua
 * activity bus). Tự subscribe socket event "activity:log" và filter theo
 * scope. Có "replay" 100 entry gần nhất khi mount.
 *
 * scope hợp lệ:
 *   files | process | kernel | cron | packages | system | network |
 *   demo  | strace  | terminal | all
 *
 * Hiển thị mỗi entry như terminal:
 *   $ chmod 755 /tmp/test.sh
 *   ✓ exit=0  · 12ms
 *   <output snippet…>
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ChevronDown, ChevronRight, Trash2, Pause, Play, Download, Search } from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'

const LEVEL_TONE = {
  info:    { color: 'var(--text2)', mark: '·', pillBg: 'var(--surface2)' },
  success: { color: 'var(--green)', mark: '✓', pillBg: 'rgba(52,211,153,0.15)' },
  error:   { color: 'var(--red)',   mark: '✗', pillBg: 'rgba(248,113,113,0.15)' },
  warn:    { color: 'var(--yellow)',mark: '!', pillBg: 'rgba(251,191,36,0.15)' },
}

export default function ActivityLog({
  scope = 'all',
  title,
  height = 220,
  showOutput = true,
  className = '',
}) {
  const { socket, on, off, emit, connected } = useSocketStore()
  const [entries, setEntries] = useState([])
  const [paused, setPaused]   = useState(false)
  const [filter, setFilter]   = useState('')
  const [expanded, setExpanded] = useState({}) // id → bool
  const bottomRef = useRef(null)

  /* Replay khi mount + listen realtime */
  useEffect(() => {
    if (!socket) return
    emit('activity:replay', { scope, limit: 100 })

    const onReplay = (d) => {
      if (d.scope !== scope && scope !== 'all') return
      setEntries(d.entries || [])
    }
    const onLive = (e) => {
      if (paused) return
      if (scope !== 'all' && e.scope !== scope) return
      setEntries(prev => [...prev.slice(-499), e])
    }

    on('activity:replay', onReplay)
    on('activity:log', onLive)
    return () => {
      off('activity:replay')
      off('activity:log')
    }
  }, [socket, scope, paused])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  const visible = useMemo(() => {
    if (!filter) return entries
    const q = filter.toLowerCase()
    return entries.filter(e =>
      e.command?.toLowerCase().includes(q) ||
      e.output?.toLowerCase().includes(q),
    )
  }, [entries, filter])

  const clearAll = () => setEntries([])
  const download = () => {
    const text = entries
      .map(e => `[${e.ts}] (${e.scope}) $ ${e.command}\n   exit=${e.code} · ${e.meta?.durationMs ?? '-'}ms\n${e.output ? '   ' + e.output.split('\n').join('\n   ') + '\n' : ''}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `activity-${scope}-${Date.now()}.log`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`card overflow-hidden flex flex-col ${className}`} style={{ height }}>
      {/* Header */}
      <div className="terminal-header flex items-center gap-2 shrink-0">
        <span className="terminal-dot bg-red-400/60" />
        <span className="terminal-dot bg-yellow-400/60" />
        <span className="terminal-dot bg-green-400/60" />
        <Activity size={11} style={{ color: 'var(--accent)' }} className="ml-1" />
        <span className="text-[10.5px] mono uppercase tracking-widest" style={{ color: 'var(--text3)' }}>
          {title || `${scope} activity`}
        </span>
        <span className="badge badge-cyan ml-1" style={{ fontSize: 9 }}>{visible.length}</span>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="filter…"
              className="input !py-0.5 !px-2 !pl-6 !text-[11px]"
              style={{ width: 110 }}
            />
          </div>
          <button onClick={() => setPaused(v => !v)} className="btn-ghost p-1" title={paused ? 'Resume' : 'Pause'}>
            {paused ? <Play size={11} /> : <Pause size={11} />}
          </button>
          <button onClick={download} className="btn-ghost p-1" title="Download .log"><Download size={11} /></button>
          <button onClick={clearAll}  className="btn-ghost p-1" title="Clear view"><Trash2 size={11} /></button>
          <span className={`w-1.5 h-1.5 rounded-full ml-1 ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-3 mono text-[11.5px] leading-relaxed"
           style={{ background: 'var(--code-bg)' }}>
        {visible.length === 0 && (
          <div className="opacity-30 flex items-center justify-center h-full text-center px-4">
            Chưa có thao tác nào. Mỗi command thực thi sẽ xuất hiện ở đây kèm exit code & output.
          </div>
        )}

        {visible.map(e => {
          const tone = LEVEL_TONE[e.level] || LEVEL_TONE.info
          const open = expanded[e.id]
          const has  = showOutput && e.output && e.output.trim().length > 0
          const t = e.ts ? new Date(e.ts).toLocaleTimeString('en-GB', { hour12: false }) : ''
          return (
            <div key={e.id} className="mb-1">
              <div className="flex items-start gap-2">
                <span style={{ color: 'var(--text3)' }}>{t}</span>
                <span style={{ color: 'var(--text3)' }}>·</span>
                <span style={{ color: 'var(--accent2)' }}>[{e.scope}]</span>
                <span style={{ color: 'var(--text3)' }}>$</span>
                <span style={{ color: 'var(--text)' }} className="break-all">{e.command || '(empty)'}</span>
              </div>
              <div className="flex items-center gap-2 ml-4 text-[10.5px]">
                <span
                  className="px-1.5 rounded"
                  style={{ background: tone.pillBg, color: tone.color }}
                >
                  {tone.mark} exit={e.code ?? '–'}
                </span>
                {e.meta?.durationMs != null && (
                  <span style={{ color: 'var(--text3)' }}>{e.meta.durationMs}ms</span>
                )}
                {has && (
                  <button
                    onClick={() => setExpanded(s => ({ ...s, [e.id]: !s[e.id] }))}
                    className="flex items-center gap-1"
                    style={{ color: 'var(--text3)' }}
                  >
                    {open ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                    output ({e.output.length}b)
                  </button>
                )}
              </div>
              {open && (
                <pre className="ml-4 mt-1 px-2 py-1 rounded whitespace-pre-wrap"
                     style={{ background: 'var(--surface2)', color: 'var(--text2)', fontSize: 10.5 }}>
{e.output}
                </pre>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
