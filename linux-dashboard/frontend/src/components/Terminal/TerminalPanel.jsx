import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, X, Trash2, Maximize2, Minimize2, 
  RefreshCw, Power, Terminal as TerminalIcon,
  ChevronRight, Command, Cpu, Zap, Code
} from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'
import { clsx } from 'clsx'

const QUICK_COMMANDS = [
  { label: 'System Info', cmd: 'uname -a && lscpu' },
  { label: 'Disk Usage', cmd: 'df -h' },
  { label: 'Memory', cmd: 'free -m' },
  { label: 'Network', cmd: 'ip addr' },
  { label: 'List Files', cmd: 'ls -la' },
]

export default function TerminalPanel() {
  const termRef = useRef(null)
  const xtermRef = useRef(null)
  const fitRef = useRef(new FitAddon())
  const [cmd, setCmd] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const { socket, emit, on, off, connected } = useSocketStore()
  const inputBuffer = useRef('')

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
    })

    const fitAddon = fitRef.current
    xterm.loadAddon(fitAddon)
    
    // Safety flag for disposal
    let isDisposed = false

    const prompt = () => {
      if (!isDisposed) xterm.write('\x1b[1;32mroot@ubuntu\x1b[0m:\x1b[1;34m~\x1b[0m# ')
    }

    // Only open if container is visible and has dimensions
    const initTerminal = () => {
      if (termRef.current && termRef.current.offsetParent && !xterm.element) {
        xterm.open(termRef.current)
        try {
          fitAddon.fit()
        } catch (e) {}
        
        xterm.writeln('\x1b[1;36m┌──────────────────────────────────────────┐\x1b[0m')
        xterm.writeln('\x1b[1;36m│\x1b[0m  \x1b[1;37mCYBERPUNK LINUX TERMINAL v2.0\x1b[0m           \x1b[1;36m│\x1b[0m')
        xterm.writeln('\x1b[1;36m│\x1b[0m  \x1b[38;5;244mInteractive Shell Emulation Ready\x1b[0m       \x1b[1;36m│\x1b[0m')
        xterm.writeln('\x1b[1;36m└──────────────────────────────────────────┘\x1b[0m')
        prompt()
        xtermRef.current = xterm
      }
    }

    // Initialize or wait for visibility
    initTerminal()
    const visibilityCheck = setInterval(initTerminal, 500)

    // Direct keyboard input handling
    xterm.onData(data => {
      if (!connected || isDisposed) return
      
      if (data === '\r') { // Enter
        const command = inputBuffer.current.trim()
        xterm.write('\r\n')
        if (command) {
          emit('terminal:execute', { command, id: Date.now() })
        } else {
          prompt()
        }
        inputBuffer.current = ''
      } else if (data === '\u007f') { // Backspace
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1)
          xterm.write('\b \b')
        }
      } else if (data.length === 1 && data.charCodeAt(0) >= 32) { // printable chars
        inputBuffer.current += data
        xterm.write(data)
      }
    })

    const onOutput = (data) => {
      if (isDisposed) return
      xterm.write(data.data.replace(/\n/g, '\r\n'))
    }

    const onError = (data) => {
      if (isDisposed) return
      xterm.write(`\r\n\x1b[31m[ERROR] ${data.error}\x1b[0m\r\n`)
      prompt()
    }

    const onClose = (data) => {
      if (isDisposed) return
      if (data.code !== 0) {
        xterm.write(`\r\n\x1b[38;5;240m[process exited with code ${data.code}]\x1b[0m\r\n`)
      } else {
        xterm.write('\r\n')
      }
      prompt()
    }

    on('terminal:output', onOutput)
    on('terminal:error', onError)
    on('terminal:close', onClose)

    // Resize handling using ResizeObserver for better accuracy
    const resizeObserver = new ResizeObserver(() => {
      if (!isDisposed && xterm.element && termRef.current?.offsetParent) {
        try {
          fitAddon.fit()
        } catch (e) {}
      }
    })
    
    if (termRef.current) resizeObserver.observe(termRef.current)

    return () => {
      isDisposed = true
      clearInterval(visibilityCheck)
      resizeObserver.disconnect()
      off('terminal:output')
      off('terminal:error')
      off('terminal:close')
      xtermRef.current = null
      try {
        xterm.dispose()
      } catch (e) {}
    }
  }, [connected])

  const runCommand = (command) => {
    const xterm = xtermRef.current
    if (!xterm) return
    xterm.write(`\x1b[1;33m${command}\x1b[0m\r\n`)
    emit('terminal:execute', { command, id: Date.now() })
  }

  const clear = () => {
    if (xtermRef.current) {
      xtermRef.current.reset()
      xtermRef.current.write('\x1b[1;32mroot@ubuntu\x1b[0m:\x1b[1;34m~\x1b[0m# ')
    }
    inputBuffer.current = ''
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
            <span>Interactive Terminal</span>
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
          <div className={clsx(
            "flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
            connected ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}>
            <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", connected ? "bg-green-400" : "bg-red-400")} />
            {connected ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
      </div>

      {/* Quick Commands Panel */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.02] border-b border-white/5 overflow-x-auto no-scrollbar">
        <Zap size={10} className="text-yellow-400 flex-shrink-0" />
        <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter whitespace-nowrap mr-1">Quick:</span>
        {QUICK_COMMANDS.map(q => (
          <button 
            key={q.label}
            onClick={() => setCmd(q.cmd)}
            className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/10 text-[9px] text-white/30 hover:text-cyan-400 transition-all whitespace-nowrap"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 min-h-0 relative group cursor-text">
        <div ref={termRef} className="absolute inset-0 p-4 xterm-container" />
      </div>

      {/* Input Field (Alternative) */}
      <div className="p-4 bg-black/40 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus-within:border-cyan-500/50 transition-all shadow-inner">
          <span className="text-cyan-400 font-mono text-sm select-none">❯</span>
          <input 
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && cmd.trim()) {
                runCommand(cmd)
                setCmd('')
              }
            }}
            placeholder="Type command and press Enter..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white/90 placeholder:text-white/10"
          />
          <div className="flex items-center gap-2">
            <span className="hidden md:block text-[9px] text-white/10 font-bold tracking-widest">CMD_EXEC</span>
            <button 
              onClick={() => { if(cmd.trim()) { runCommand(cmd); setCmd('') } }}
              disabled={!cmd.trim()}
              className="p-1.5 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-20 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="px-4 py-1.5 bg-cyan-500/5 flex items-center justify-between text-[9px] font-bold tracking-[0.2em] text-cyan-400/40 uppercase">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><Cpu size={10} /> 1.2% LOAD</span>
          <span className="flex items-center gap-1.5"><Command size={10} /> SSH ACTIVE</span>
          <span className="flex items-center gap-1.5 text-white/10"><Code size={10} /> INTERACTIVE_PTY: EMULATED</span>
        </div>
        <span>ENCRYPTED_LINK : TLS_v1.3</span>
      </div>
    </div>
  )
}
