import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, X, Trash2, Maximize2, Minimize2, 
  RefreshCw, Power, Terminal as TerminalIcon,
  ChevronRight, Command, Cpu
} from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'
import { clsx } from 'clsx'

export default function TerminalPanel() {
  const termRef = useRef(null)
  const xtermRef = useRef(null)
  const fitRef = useRef(new FitAddon())
  const [cmd, setCmd] = useState('')
  const [connected, setConnected] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const { socket, emit, on, off } = useSocketStore()

  useEffect(() => {
    if (!termRef.current) return

    const xterm = new XTerm({
      theme: {
        background: '#0a0b10',
        foreground: '#f8fafc',
        cursor: '#22d3ee',
        cursorAccent: '#0a0b10',
        selection: 'rgba(34,211,238,0.2)',
        black: '#000000',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      drawBoldTextInBrightColors: true,
      letterSpacing: 0,
    })

    xterm.loadAddon(fitRef.current)
    xterm.open(termRef.current)
    fitRef.current.fit()
    xtermRef.current = xterm

    // Initial greeting
    xterm.writeln('\x1b[1;36m┌──────────────────────────────────────────┐\x1b[0m')
    xterm.writeln('\x1b[1;36m│\x1b[0m  \x1b[1;37mCYBERPUNK LINUX TERMINAL v2.0\x1b[0m           \x1b[1;36m│\x1b[0m')
    xterm.writeln('\x1b[1;36m│\x1b[0m  \x1b[38;5;244mSystem access granted. No auth required.\x1b[0m  \x1b[1;36m│\x1b[0m')
    xterm.writeln('\x1b[1;36m└──────────────────────────────────────────┘\x1b[0m')
    xterm.writeln('')
    xterm.write('\x1b[1;32mroot@ubuntu\x1b[0m:\x1b[1;34m~\x1b[0m# ')

    setConnected(true)

    // Handlers
    const onOutput = (data) => {
      xterm.write(data.data)
    }

    const onError = (data) => {
      xterm.write(`\r\n\x1b[31m[ERROR] ${data.error}\x1b[0m\r\n`)
      xterm.write('\x1b[1;32mroot@ubuntu\x1b[0m:\x1b[1;34m~\x1b[0m# ')
    }

    const onClose = (data) => {
      xterm.writeln(`\r\n\x1b[38;5;240m[process exited with code ${data.code}]\x1b[0m`)
      xterm.write('\x1b[1;32mroot@ubuntu\x1b[0m:\x1b[1;34m~\x1b[0m# ')
    }

    on('terminal:output', onOutput)
    on('terminal:error', onError)
    on('terminal:close', onClose)

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
    emit('terminal:execute', { command: cmd, id: Date.now() })
    setCmd('')
  }

  const clear = () => {
    xtermRef.current?.reset()
    xtermRef.current?.write('\x1b[1;32mroot@ubuntu\x1b[0m:\x1b[1;34m~\x1b[0m# ')
  }

  return (
    <div className={clsx(
      "flex flex-col bg-[#0a0b10] border border-white/5 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300",
      isExpanded ? "fixed inset-5 z-50" : "h-full min-h-[500px]"
    )}>
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            <TerminalIcon size={12} className="text-cyan-400" />
            <span>Bash Shell Session</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={clear} title="Clear Terminal" className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} title="Toggle Fullscreen" className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all">
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            ONLINE
          </div>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 min-h-0 relative group">
        <div ref={termRef} className="absolute inset-0 p-4 xterm-container" />
      </div>

      {/* Interactive Command Bar */}
      <div className="p-4 bg-black/40 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus-within:border-cyan-500/50 transition-all">
          <span className="text-cyan-400 font-mono text-sm select-none">❯</span>
          <input 
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Type command here..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white/90 placeholder:text-white/10"
          />
          <div className="flex items-center gap-2">
            <span className="hidden md:block text-[10px] text-white/20 font-mono">ENTER TO EXEC</span>
            <button 
              onClick={run}
              disabled={!cmd.trim()}
              className="p-1.5 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-20 transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="px-4 py-1.5 bg-cyan-500/5 flex items-center justify-between text-[9px] font-bold tracking-[0.2em] text-cyan-400/40 uppercase">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><Cpu size={10} /> 1.2% LOAD</span>
          <span className="flex items-center gap-1"><Command size={10} /> SSH ACTIVE</span>
        </div>
        <span>ENCRYPTED CHANNEL : AES-256</span>
      </div>
    </div>
  )
}
