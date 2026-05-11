import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Shield, Trash2, Clock, 
  RefreshCw, CheckCircle, AlertCircle, 
  Terminal, HardDrive, Package, Server, X as CloseIcon
} from 'lucide-react'
import api from '../../utils/api'

const AUTOMATIONS = [
  {
    id: 'cleanup',
    label: 'Clean System Temp',
    desc: 'Clear /tmp and apt cache to free space',
    icon: Trash2,
    color: 'var(--red)',
    cmd: 'sudo apt-get clean && sudo rm -rf /tmp/* /var/tmp/*',
    category: 'System'
  },
  {
    id: 'update',
    label: 'Full System Update',
    desc: 'Run apt update & upgrade automatically',
    icon: RefreshCw,
    color: 'var(--accent)',
    cmd: 'sudo apt-get update && sudo apt-get upgrade -y',
    category: 'Software'
  },
  {
    id: 'backup',
    label: 'Backup Home Dir',
    desc: 'Create compressed archive of home directory',
    icon: HardDrive,
    color: 'var(--green)',
    cmd: 'tar -czf ~/home_backup_$(date +%F).tar.gz ~ --exclude=node_modules',
    category: 'Safety'
  },
  {
    id: 'time',
    label: 'Sync Network Time',
    desc: 'Force sync system clock with NTP pool',
    icon: Clock,
    color: 'var(--yellow)',
    cmd: 'sudo timedatectl set-ntp true && sudo systemctl restart systemd-timesyncd',
    category: 'Time'
  },
  {
    id: 'ports',
    label: 'Scan Open Ports',
    desc: 'List all active listening sockets',
    icon: Shield,
    color: 'var(--pink)',
    cmd: 'ss -tulpn',
    category: 'Network'
  },
  {
    id: 'hardware',
    label: 'Hardware Report',
    desc: 'Generate detailed CPU/Memory report',
    icon: Server,
    color: 'var(--accent2)',
    cmd: 'lscpu && free -h && lsblk',
    category: 'System'
  }
]

export default function AutomationHub() {
  const [running, setRunning] = useState(null)
  const [result, setResult] = useState(null)

  const execute = async (task) => {
    setRunning(task.id)
    setResult(null)
    try {
      // We'll use the terminal execution endpoint for these automations
      const r = await api.post('/process/execute', { command: task.cmd })
      setResult({
        success: true,
        title: task.label,
        output: r.data.output || r.data.message || 'Task completed successfully'
      })
    } catch (e) {
      setResult({
        success: false,
        title: task.label,
        output: e.response?.data?.error || 'Execution failed'
      })
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Zap size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Automation Hub</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold">One-Click System Actions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AUTOMATIONS.map((task) => (
          <motion.div
            key={task.id}
            whileHover={{ y: -2 }}
            className="card group cursor-pointer overflow-hidden relative"
            onClick={() => !running && execute(task)}
          >
            <div className="p-5 flex flex-col gap-4 relative z-10">
              <div className="flex items-start justify-between">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-lg"
                  style={{ background: `${task.color}10`, border: `1px solid ${task.color}20` }}
                >
                  <task.icon size={22} style={{ color: task.color }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-white/5 text-white/20">
                  {task.category}
                </span>
              </div>
              
              <div>
                <h3 className="text-sm font-bold group-hover:text-cyan-400 transition-colors">{task.label}</h3>
                <p className="text-xs text-white/40 mt-1 line-clamp-2">{task.desc}</p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/20 truncate max-w-[150px]">{task.cmd}</span>
                <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-bold group-hover:translate-x-1 transition-transform">
                  RUN <RefreshCw size={10} className={running === task.id ? 'animate-spin' : ''} />
                </div>
              </div>
            </div>

            {/* Hover effect background */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop" onClick={() => setResult(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="modal-box max-w-3xl border-cyan-500/20" onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {result.success ? <CheckCircle className="text-green-400" /> : <AlertCircle className="text-red-400" />}
                  <h3 className="text-sm font-bold uppercase tracking-widest">{result.title}</h3>
                </div>
                <button onClick={() => setResult(null)} className="text-white/20 hover:text-white"><CloseIcon size={18} /></button>
              </div>
              
              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  <Terminal size={12} /> Execution Output
                </div>
                <pre className="text-xs font-mono text-cyan-400/80 max-h-[400px] overflow-auto custom-scrollbar leading-relaxed">
                  {result.output}
                </pre>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setResult(null)} className="btn-primary px-8">Acknowledge</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
