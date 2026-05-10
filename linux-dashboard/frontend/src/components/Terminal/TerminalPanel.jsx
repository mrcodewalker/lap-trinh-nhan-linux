import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { motion } from 'framer-motion'
import { Send, X, Plus } from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'

export default function TerminalPanel() {
  const terminalRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(new FitAddon())
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const { socket, emit, on, off } = useSocketStore()

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize xterm
    const xterm = new XTerm({
      theme: {
        background: '#0a0e27',
        foreground: '#00f5ff',
        cursor: '#00f5ff',
        cursorAccent: '#0a0e27',
        selection: 'rgba(157, 78, 221, 0.3)',
        black: '#000000',
        red: '#ff006e',
        green: '#00ff41',
        yellow: '#ffbe0b',
        blue: '#3a86ff',
        magenta: '#9d4edd',
        cyan: '#00f5ff',
        white: '#ffffff'
      },
      fontFamily: 'JetBrains Mono',
      fontSize: 12,
      lineHeight: 1.5
    })

    xterm.loadAddon(fitAddonRef.current)
    xterm.open(terminalRef.current)
    fitAddonRef.current.fit()
    xtermRef.current = xterm

    xterm.writeln('\x1b[1;36m╔════════════════════════════════════════╗\x1b[0m')
    xterm.writeln('\x1b[1;36m║  Linux System Programming Dashboard    ║\x1b[0m')
    xterm.writeln('\x1b[1;36m║  Terminal v1.0                         ║\x1b[0m')
    xterm.writeln('\x1b[1;36m╚════════════════════════════════════════╝\x1b[0m')
    xterm.writeln('')
    xterm.write('\x1b[1;32m$ \x1b[0m')

    // Socket listeners
    const handleOutput = (data) => {
      xterm.write(data.data)
    }

    const handleError = (data) => {
      xterm.write(`\x1b[1;31m${data.error}\x1b[0m`)
    }

    const handleClose = (data) => {
      xterm.writeln(`\n\x1b[1;33m[Process exited with code ${data.code}]\x1b[0m`)
      xterm.write('\x1b[1;32m$ \x1b[0m')
    }

    on('terminal:output', handleOutput)
    on('terminal:error', handleError)
    on('terminal:close', handleClose)

    // Handle window resize
    const handleResize = () => {
      fitAddonRef.current.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      off('terminal:output')
      off('terminal:error')
      off('terminal:close')
      window.removeEventListener('resize', handleResize)
      xterm.dispose()
    }
  }, [socket])

  const executeCommand = () => {
    if (!command.trim()) return

    const xterm = xtermRef.current
    xterm.writeln(command)
    setHistory([...history, command])
    setHistoryIndex(-1)

    emit('terminal:execute', {
      command,
      id: Date.now()
    })

    setCommand('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeCommand()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIndex = historyIndex + 1
      if (newIndex < history.length) {
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand('')
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-lg border border-cyber-cyan/30 overflow-hidden flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-cyan/20 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse" />
          <span className="text-sm font-mono text-cyber-cyan">Terminal</span>
        </div>
        <button className="p-1 hover:glass rounded transition-smooth">
          <X size={16} />
        </button>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-hidden bg-black/50"
        style={{ minHeight: '400px' }}
      />

      {/* Input */}
      <div className="border-t border-cyber-cyan/20 bg-black/30 p-3">
        <div className="flex items-center gap-2">
          <span className="text-neon-green font-mono text-sm">$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="flex-1 bg-transparent outline-none font-mono text-sm text-cyber-cyan placeholder-cyber-cyan/30"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={executeCommand}
            className="p-2 rounded-lg hover:glass transition-smooth"
          >
            <Send size={16} className="text-cyber-cyan" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
