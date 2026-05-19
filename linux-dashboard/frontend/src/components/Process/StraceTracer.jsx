/**
 * <StraceTracer /> — chạy strace trên 1 lệnh và stream kết quả realtime
 * + bảng thống kê syscall (-c).
 */
import React, { useEffect, useRef, useState } from 'react'
import { Play, Square, BarChart2, Terminal as TermIcon, RefreshCw } from 'lucide-react'
import api from '../../utils/api'
import { useSocketStore } from '../../store/socketStore'
import ExplainPanel from '../Explain/ExplainPanel'
import ActivityLog from '../ActivityLog/ActivityLog'

export default function StraceTracer() {
  const { on, off, emit, connected } = useSocketStore()
  const [available, setAvailable] = useState(null)
  const [command, setCommand]     = useState('ls -la /etc | head')
  const [streaming, setStreaming] = useState(false)
  const [lines, setLines]         = useState([])
  const [summary, setSummary]     = useState(null)
  const [busy, setBusy]           = useState(false)
  const sidRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    api.get('/strace/check').then(r => setAvailable(r.data.available))
                            .catch(() => setAvailable(false))
  }, [])

  useEffect(() => {
    const onLine = (d) => {
      if (d.sid !== sidRef.current) return
      setLines(prev => [...prev.slice(-1499), { line: d.line, level: d.level || 'info' }])
    }
    const onDone = (d) => {
      if (d.sid !== sidRef.current) return
      setLines(prev => [...prev, { line: `\n[strace exit=${d.code ?? '?'}]`, level: d.code === 0 ? 'success' : 'warn' }])
      setStreaming(false)
    }
    on('strace:line', onLine)
    on('strace:done', onDone)
    return () => { off('strace:line'); off('strace:done') }
  }, [])

  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  const startStream = () => {
    if (!command.trim()) return
    sidRef.current = String(Date.now())
    setLines([])
    setStreaming(true)
    emit('strace:start', { command, sid: sidRef.current })
  }
  const stopStream = () => { emit('strace:cancel'); setStreaming(false) }

  const runSummary = async () => {
    if (!command.trim()) return
    setBusy(true)
    try {
      const r = await api.post('/strace/summary', { command })
      setSummary(r.data)
    } catch (e) {
      setSummary({ error: e.response?.data?.error || e.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <TermIcon size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold mr-2">strace</span>
        {available === false && <span className="badge badge-yellow">strace chưa cài: sudo apt install strace</span>}
        <input value={command} onChange={e => setCommand(e.target.value)}
               placeholder='ví dụ: ls -la /etc | head'
               className="input flex-1 min-w-[260px] mono text-xs" />

        {streaming
          ? <button onClick={stopStream} className="btn-danger flex items-center gap-1.5"><Square size={12}/> Stop</button>
          : <button onClick={startStream} disabled={!connected || available === false} className="btn-primary flex items-center gap-1.5"><Play size={12}/> Trace live</button>}
        <button onClick={runSummary} disabled={busy || available === false}
                className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5">
          <BarChart2 size={12}/> Counts
        </button>
        <ExplainPanel data={{
          summary: 'strace gắn vào ptrace() syscall, log mọi syscall từ user → kernel.',
          syscalls: ['fork', 'execve'],
          concepts: ['ptrace', 'PTRACE_SYSCALL', 'syscall'],
          command: 'strace -c -f -- bash -c "<command>"',
        }} label="explain strace" />
      </div>

      {/* Live trace */}
      <div className="card overflow-hidden flex flex-col" style={{ height: 360 }}>
        <div className="terminal-header">
          <span className="terminal-dot bg-red-400/60" />
          <span className="terminal-dot bg-yellow-400/60" />
          <span className="terminal-dot bg-green-400/60" />
          <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>strace -f -tt -T</span>
          {streaming && <span className="ml-3 flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/> LIVE
          </span>}
        </div>
        <div className="flex-1 overflow-auto p-3 mono text-[11px]" style={{ background: 'var(--code-bg)' }}>
          {lines.length === 0 && <div className="opacity-30 text-center py-10">Click "Trace live" để xem syscall realtime</div>}
          {lines.map((l, i) => (
            <div key={i} style={{ color: levelColor(l.level), whiteSpace: 'pre-wrap' }}>{l.line}</div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Counts table */}
      {summary && (
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">strace -c summary</h3>
            {busy && <RefreshCw size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />}
          </div>
          {summary.error
            ? <div className="banner-error">{summary.error}</div>
            : (
              <div className="overflow-auto" style={{ maxHeight: 260 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>%</th><th>seconds</th><th>μs/call</th><th>calls</th><th>errors</th><th>syscall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.rows || []).map((r, i) => (
                      <tr key={i}>
                        <td className="mono">{r.pctTime.toFixed(2)}</td>
                        <td className="mono">{r.seconds.toFixed(6)}</td>
                        <td className="mono">{r.usecsPerCall}</td>
                        <td className="mono">{r.calls}</td>
                        <td className="mono" style={{ color: r.errors ? 'var(--red)' : 'var(--text3)' }}>{r.errors}</td>
                        <td className="mono" style={{ color: 'var(--accent)' }}>{r.syscall}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      <ActivityLog scope="strace" title="Strace runs · live" height={180} />
    </div>
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
