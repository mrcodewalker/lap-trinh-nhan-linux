import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarClock, Plus, Trash2, RefreshCw, X, Check, Clock, Code, Terminal as TerminalIcon } from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'

const PRESETS = [
  { label: 'Every minute',    value: '* * * * *' },
  { label: 'Every hour',      value: '0 * * * *' },
  { label: 'Daily at 2am',    value: '0 2 * * *' },
  { label: 'Weekly',          value: '0 0 * * 0' },
]

const FIELDS      = ['minute','hour','dayOfMonth','month','dayOfWeek']
const FIELD_LABELS = ['Min','Hour','Dom','Mon','Dow']
const FIELD_HINTS  = ['0-59','0-23','1-31','1-12','0-7']

export default function CronManager() {
  const [jobs, setJobs]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ 
    minute:'*', hour:'*', dayOfMonth:'*', month:'*', dayOfWeek:'*', 
    command:'', mode: 'cmd', scriptContent: '' 
  })
  const [saving, setSaving]     = useState(false)

  useEffect(() => { loadJobs() }, [])

  const loadJobs = async () => {
    setLoading(true); setError(null)
    try {
      const r = await api.get('/shell/cron/list')
      setJobs(r.data.jobs || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load cron jobs')
    } finally { setLoading(false) }
  }

  const applyPreset = (preset) => {
    const [m, h, dom, mo, dow] = preset.split(' ')
    setForm(f => ({ ...f, minute: m, hour: h, dayOfMonth: dom, month: mo, dayOfWeek: dow }))
  }

  const addJob = async (e) => {
    e.preventDefault()
    let finalCommand = form.command
    
    if (form.mode === 'script') {
      if (!form.scriptContent.trim()) { setError('Script content is required'); return }
      setSaving(true)
      try {
        const scriptName = `cron_${Date.now()}.sh`
        const r = await api.post('/shell/scripts/save', { name: scriptName, content: form.scriptContent })
        finalCommand = `bash ${r.data.path}`
      } catch (e) {
        setError('Failed to save script: ' + (e.response?.data?.error || e.message))
        setSaving(false); return
      }
    } else if (!finalCommand.trim()) {
      setError('Command is required'); return
    }

    setSaving(true)
    try {
      await api.post('/shell/cron/add', { ...form, command: finalCommand })
      setForm({ minute:'*', hour:'*', dayOfMonth:'*', month:'*', dayOfWeek:'*', command:'', mode: 'cmd', scriptContent: '' })
      setShowForm(false); loadJobs()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add cron job')
    } finally { setSaving(false) }
  }

  const removeJob = async (id) => {
    if (!confirm('Remove this cron job?')) return
    try {
      await api.post('/shell/cron/remove', { id }); loadJobs()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to remove cron job')
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 max-h-[calc(100vh-180px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <CalendarClock size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white/90">Task Scheduler</h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{jobs.length} Active Automations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadJobs} className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 shadow-lg">
            <RefreshCw size={16} className={loading ? 'animate-spin text-cyan-400' : ''} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
            <Plus size={16} /> NEW CRON JOB
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
          <X size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-auto opacity-40 hover:opacity-100"><X size={14} /></button>
        </motion.div>
      )}

      {/* Main List */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-black/40 border border-white/5 rounded-3xl p-2 shadow-2xl">
        {jobs.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-white/10 gap-4 py-20">
            <div className="w-20 h-20 rounded-3xl border-2 border-dashed border-white/5 flex items-center justify-center">
              <Clock size={32} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em]">No Jobs Scheduled</p>
              <p className="text-[10px] uppercase tracking-wider mt-1 text-white/5">Start by adding a recurring task</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
            {jobs.map((job, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Clock size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white/80 truncate font-mono">{job.command}</p>
                  <p className="text-[10px] font-bold text-cyan-500/60 mt-1 uppercase tracking-widest">{job.schedule}</p>
                </div>
                <button onClick={() => removeJob(job.id)} className="p-2 rounded-xl bg-red-500/0 hover:bg-red-500/20 text-red-500/0 hover:text-red-400 group-hover:text-red-500/40 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Job Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop z-50 px-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className="modal-box max-w-2xl border-white/10 p-8 shadow-2xl backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Plus size={20} className="text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold">New Scheduled Task</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/20 hover:text-white"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Schedule */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Select Timing</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESETS.map(p => (
                        <button key={p.value} type="button" onClick={() => applyPreset(p.value)} className="py-2 px-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest hover:border-cyan-500/30 hover:text-cyan-400 transition-all">
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {FIELDS.map((field, i) => (
                      <div key={field}>
                        <label className="text-[9px] font-bold text-white/20 uppercase block mb-1 text-center">{FIELD_LABELS[i]}</label>
                        <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 text-center text-xs font-mono text-cyan-400 focus:border-cyan-500/50 outline-none" placeholder={FIELD_HINTS[i]} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Execution */}
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Execution Mode</p>
                     <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl">
                       <button onClick={() => setForm(f => ({ ...f, mode: 'cmd' }))} className={clsx("p-1.5 rounded-lg transition-all", form.mode === 'cmd' ? "bg-cyan-500 text-black shadow-lg" : "text-white/20 hover:text-white/40")}>
                         <TerminalIcon size={14} />
                       </button>
                       <button onClick={() => setForm(f => ({ ...f, mode: 'script' }))} className={clsx("p-1.5 rounded-lg transition-all", form.mode === 'script' ? "bg-cyan-500 text-black shadow-lg" : "text-white/20 hover:text-white/40")}>
                         <Code size={14} />
                       </button>
                     </div>
                   </div>

                   {form.mode === 'script' ? (
                     <div className="space-y-2">
                        <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-inner group">
                          <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-white/20 uppercase font-mono">script_runner.sh</span>
                          </div>
                          <textarea 
                            value={form.scriptContent || '#!/bin/bash\n\necho "Task started at $(date)"\n# Your code here...'} 
                            onChange={e => setForm(f => ({ ...f, scriptContent: e.target.value }))}
                            className="w-full h-32 bg-transparent p-4 text-xs font-mono text-cyan-400/80 outline-none resize-none leading-relaxed"
                          />
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono text-cyan-400 outline-none focus:border-cyan-500/50 shadow-inner" placeholder="Enter shell command..." />
                     </div>
                   )}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                 <div className="font-mono text-[10px] text-white/20">
                   <span className="text-cyan-500/60 font-bold uppercase mr-2">EXPRESSION:</span>
                   {form.minute} {form.hour} {form.dayOfMonth} {form.month} {form.dayOfWeek}
                 </div>
                 <div className="flex gap-3">
                   <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-2xl text-white/40 hover:text-white text-xs font-bold transition-colors">CANCEL</button>
                   <button onClick={addJob} disabled={saving} className="px-8 py-3 rounded-2xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50">
                     {saving ? 'SAVING...' : 'SCHEDULE TASK'}
                   </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
