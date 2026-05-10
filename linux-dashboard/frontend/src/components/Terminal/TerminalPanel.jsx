import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { motion } from 'framer-motion'
import { Send, X, Trash2 } from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'

export default function TerminalPanel() {
  const termRef   = useRef(null)
  const xtermRef  = useRef(null)
  const fitRef    = useRef(new FitAddon())
  const [cmd, setCmd]         = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const { socket, emit, on, off } = useSocketStore()

  useEffect(() => {
    if (!termRef.current) return

    const xterm = new XTerm({
      theme: {
        background:    '#020408',
        foreground:    '#e2e8f0',
        cursor:        '#22d3ee',
        cursorAccent:  '#020408',
        selection:     'rgba(139,92,246,0.3)',
        black:         '#000000',
        red:           '#f87171',
        green:         '#34d399',
        yellow:        '#fbbf24',
        blue:          '#60a5fa',
        magenta:       '#a78bfa',
        cyan:          '#22d3ee',
        white:         '#e2e8f0',
        brightBlack:   '#374151',
        brightGreen:   '#6ee7b7',
        brightCyan:    '#67e8f9',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 12,
      lineHeight: 1.6,
      cursorBlink: true,
      cursorStyle: 'bar',
    })

    xterm.loadAddon(fitRef.current)
    xterm.open(termRef.current)
    fitRef.current.fit()
    xtermRef.current = xterm

    xterm.writeln('\x1b[1;36m  Linux Dashboard Terminal\x1b[0m')
    xterm.writeln('\x1b[38;5;240m  Type a command and press Enter\x1b[0m')
    xterm.writeln('')
    xterm.write('\x1b[1;32m❯\x1b[0m ')

    const onOutput = (data) => xterm.write(data.data)
    const onError  = (data) => xterm.write(`\x1b[31m${data.error}\x1b[0m`)
    const onClose  = (data) => {
      xterm.writeln(`\n\x1b[38;5;240m[exit ${data.code}]\x1b[0m`)
      xterm.write('\x1b[1;32m❯\x1b[0m ')
    }

    on('terminal:output', onOutput)
    on('terminal:error',  onError)
    on('terminal:close',  onClose)

    const resize = () => fitRef.current.fit()
    window.addEventListener('resize', resize)

    return () => {
      off('terminal:output')
      off('terminal:error')
      off('terminal:close')
      window.removeEventListener('resize', resize)
      xterm.dispose()
    }
  }, [socket])

  const run = () => {
    if (!cmd.trim()) return
    const xterm = xtermRef.current
    xterm.writeln(cmd)
    setHistory(h => [...h, cmd])
    setHistIdx(-1)
    emit('terminal:execute', { command: cmd, id: Date.now() })
    setCmd('')
  }

  const clear = () => {
    xtermRef.current?.clear()
    xtermRef.current?.write('\x1b[1;32m❯\x1b[0m ')
  }

  const onKey = (e) => {
    if (e.key === 'Enter') { run(); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = histIdx + 1
      if (idx < history.length) { setHistIdx(idx); setCmd(history[history.length - 1 - idx]) }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx > 0) { const idx = histIdx - 1; setHistIdx(idx); setCmd(history[history.length - 1 - idx]) }
      else { setHistIdx(-1); setCmd('') }
    }
  }

  return (
    <div className="terminal-wrap flex flex-col" style={{ minHeight: '480px' }}>
      {/* Header */}
      <div className="terminal-header">
        <span className="terminal-dot bg-red-400/70" />
        <span className="terminal-dot bg-yellow-400/70" />
        <span className="terminal-dot bg-green-400/70" />
        <span className="text-xs text-white/30 ml-2 font-mono">bash</span>
        <button onClick={clear} className="ml-auto p-1 rounded hover:bg-white/5 transition-colors">
          <Trash2 size={12} className="text-white/30" />
        </button>
      </div>

      {/* Terminal output */}
      <div ref={termRef} className="flex-1" style={{ minHeight: '380px' }} />

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ borderTop: '1px solid var(--border2)', background: 'rgba(0,0,0,0.15)' }}>
        <span className="mono text-sm flex-shrink-0" style={{ color: 'var(--green)' }}>❯</span>
        <input
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={onKey}
          placeholder="Enter command..."
          className="flex-1 bg-transparent outline-none mono text-sm"
          style={{ color: 'var(--text)', caretColor: 'var(--accent)' }}
        />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={run}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          <Send size={14} />
        </motion.button>
      </div>
    </div>
  )
}
