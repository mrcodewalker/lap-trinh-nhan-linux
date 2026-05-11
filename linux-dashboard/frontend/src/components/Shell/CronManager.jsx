import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarClock, Plus, Trash2, RefreshCw, X, Check, Clock, AlertCircle, Terminal, Play } from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'

const PRESETS = [
  { label: 'Every minute',    value: '* * * * *' },
  { label: 'Every hour',      value: '0 * * * *' },
  { label: 'Daily at 2am',    value: '0 2 * * *' },
  { label: 'Every Sunday',    value: '0 0 * * 0' },
  { label: 'Monthly (1st)',   value: '0 0 1 * *' },
]

const FIELDS      = ['minute','hour','dayOfMonth','month','dayOfWeek']
const FIELD_LABELS = ['Minute','Hour','Day/Month','Month','Day/Week']
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

  const [runningJob, setRunningJob] = useState(null)
  const [runResult, setRunResult]   = useState(null)

  const [showLog, setShowLog]       = useState(false)
  const [logContent, setLogContent] = useState('')

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

  const fetchLogs = async () => {
    setShowLog(true)
    setLogContent('Loading logs...')
    try {
      const h = await api.get('/shell/files/home')
      const r = await api.get('/shell/files/read', { 
        params: { file: `${h.data.home}/.dashboard_scripts/cron.log` } 
      })
      setLogContent(r.data.content || 'No logs yet.')
    } catch (e) {
      setLogContent('No execution logs found. Tasks will log to ~/.dashboard_scripts/cron.log automatically if created via this UI.')
    }
  }

  const runNow = async (command) => {
    setRunningJob(command)
    setRunResult(null)
    try {
      const r = await api.post('/shell/cron/run', { command })
      setRunResult(r.data)
    } catch (e) {
      setRunResult({ success: false, error: e.response?.data?.error || e.message })
    } finally {
      setRunningJob(null)
    }
  }

  const applyPreset = (preset) => {
    const [m, h, dom, mo, dow] = preset.split(' ')
    setForm(f => ({ ...f, minute: m, hour: h, dayOfMonth: dom, month: mo, dayOfWeek: dow }))
  }

  const addJob = async (e) => {
    e.preventDefault()
    
    let finalCommand = form.command
    let logSuffix = ' >> ~/.dashboard_scripts/cron.log 2>&1'
    
    if (form.mode === 'script' || form.mode === 'python') {
      const content = form.mode === 'python' ? form.pythonContent : form.scriptContent;
      if (!content.trim()) { setError('Content is required'); return }
      setSaving(true)
      try {
        const ext = form.mode === 'python' ? 'py' : 'sh'
        const interpreter = form.mode === 'python' ? 'python3' : 'bash'
        const scriptName = `cron_${Date.now()}.${ext}`
        const r = await api.post('/shell/scripts/save', { 
          name: scriptName, 
          content: content 
        })
        finalCommand = `${interpreter} ${r.data.path}${logSuffix}`
      } catch (e) {
        setError('Failed to save script: ' + (e.response?.data?.error || e.message))
        setSaving(false)
        return
      }
    } else if (!finalCommand.trim()) {
      setError('Command is required')
      return
    } else {
      // For raw commands, append log redirect if not present
      if (!finalCommand.includes('>>')) {
        finalCommand += logSuffix
      }
    }

    setSaving(true)
    try {
      await api.post('/shell/cron/add', { ...form, command: finalCommand })
      setForm({ 
        minute:'*', hour:'*', dayOfMonth:'*', month:'*', dayOfWeek:'*', 
        command:'', mode: 'cmd', scriptContent: '', pythonContent: '' 
      })
      setShowForm(false)
      loadJobs()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add cron job')
    } finally { setSaving(false) }
  }

  const removeJob = async (id) => {
    if (!confirm('Remove this cron job?')) return
    try {
      await api.post('/shell/cron/remove', { id })
      loadJobs()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to remove cron job')
    }
  }

  const cronPreview = `${form.minute} ${form.hour} ${form.dayOfMonth} ${form.month} ${form.dayOfWeek} ${form.command}`

  return (
    <div className="space-y-4">
      {/* Log modal */}
      <AnimatePresence>
        {showLog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="card w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] border-cyan-500/20">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <Terminal size={18} className="text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold">Cron Execution Logs</h3>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest">~/.dashboard_scripts/cron.log</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchLogs} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white">
                    <RefreshCw size={16} />
                  </button>
                  <button onClick={() => setShowLog(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-auto bg-[#050608] flex-1 custom-scrollbar">
                <pre className="text-xs font-mono text-cyan-400/80 leading-relaxed whitespace-pre-wrap">
                  {logContent}
                </pre>
              </div>
              <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                <p className="text-[10px] text-white/20 italic">Logs are appended automatically for tasks created via this dashboard.</p>
                <button onClick={() => setShowLog(false)} className="btn-primary py-2 px-6 text-xs font-bold">Close Logs</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Run result modal/banner */}
      <AnimatePresence>
        {runResult && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="card w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Terminal size={16} className="text-cyan-400" />
                  Task Execution Result
                </h3>
                <button onClick={() => setRunResult(null)} className="p-1 hover:bg-white/10 rounded">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 overflow-auto mono text-xs bg-[#050608] flex-1">
                {runResult.success ? (
                  <pre className="text-emerald-400">{runResult.output}</pre>
                ) : (
                  <pre className="text-rose-400">{runResult.error || runResult.output}</pre>
                )}
              </div>
              <div className="p-3 border-t border-white/10 bg-white/5 flex justify-end">
                <button onClick={() => setRunResult(null)} className="btn-primary py-1.5 px-4 text-xs">Close</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <CalendarClock size={20} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Cron Jobs</h2>
            <p className="text-xs text-white/40">{jobs.length} active schedules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadJobs} className="btn-ghost p-2 rounded-lg bg-white/5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={fetchLogs} className="btn-ghost flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-cyan-500/10 transition-all border border-white/5">
            <Terminal size={14} /> View Logs
          </button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20">
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>
        </motion.div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.form onSubmit={addJob}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="card p-6 space-y-5 overflow-hidden border-cyan-500/30 bg-cyan-500/[0.02]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white uppercase tracking-wider">Configure Schedule</p>
              <button type="button" onClick={() => setShowForm(false)} className="text-white/30 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Schedule */}
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase mb-2 tracking-widest">Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map(p => (
                      <button key={p.value} type="button" onClick={() => applyPreset(p.value)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {FIELDS.map((field, i) => (
                    <div key={field}>
                      <label className="text-[10px] font-bold text-white/30 block mb-1 uppercase text-center">
                        {FIELD_LABELS[i]}
                      </label>
                      <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 text-center mono text-sm focus:border-cyan-500/50 outline-none" 
                        placeholder={FIELD_HINTS[i]} />
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <p className="text-[10px] font-bold text-white/20 uppercase">Schedule Preview</p>
                  <p className="mono text-sm text-cyan-400">{form.minute} {form.hour} {form.dayOfMonth} {form.month} {form.dayOfWeek}</p>
                </div>
              </div>

              {/* Right: Task */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Execution Mode</p>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {['cmd', 'script', 'python'].map(m => (
                      <button key={m} type="button" onClick={() => setForm(f => ({ ...f, mode: m }))}
                        className={clsx(
                          "px-3 py-1 rounded-lg text-[10px] font-bold transition-all uppercase",
                          form.mode === m ? "bg-cyan-500 text-black shadow-lg" : "text-white/40 hover:text-white"
                        )}>
                        {m === 'cmd' ? 'Shell' : m}
                      </button>
                    ))}
                  </div>
                </div>

                {form.mode === 'cmd' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase">Command Line</label>
                    <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mono text-sm text-cyan-400 focus:border-cyan-500/50 outline-none" 
                      placeholder="e.g. curl https://api.health.com/check" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-white/30 uppercase">{form.mode} Script</label>
                      <span className="text-[10px] mono text-white/20">{form.mode === 'python' ? 'app.py' : 'worker.sh'}</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <textarea 
                        value={form.mode === 'python' ? form.pythonContent : form.scriptContent} 
                        onChange={e => setForm(f => ({ ...f, [form.mode === 'python' ? 'pythonContent' : 'scriptContent']: e.target.value }))}
                        className="w-full h-40 bg-[#0a0b10] p-4 text-xs mono text-cyan-400 outline-none resize-none leading-relaxed"
                        placeholder={form.mode === 'python' ? 'import os\nprint("Hello from Python")' : '#!/bin/bash\necho "Hello from Shell"'}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-white/40 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center gap-2 px-8 py-2 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50">
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                Schedule Task
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Jobs list */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <RefreshCw size={40} className="mx-auto animate-spin text-cyan-500/20" />
            <p className="text-sm text-white/20 font-mono tracking-widest uppercase">Fetching crontab...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-20 text-center bg-white/[0.01]">
            <CalendarClock size={48} className="mx-auto mb-4 text-white/5" />
            <p className="text-sm text-white/40 mb-6">No scheduled tasks found in crontab</p>
            <button onClick={() => setShowForm(true)} className="btn-primary px-6 py-2 rounded-xl text-sm font-bold">
              Create First Task
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {jobs.map((job, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card p-4 group hover:border-cyan-500/30 transition-all bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/10 transition-colors">
                    <Clock size={20} className="text-cyan-400/60 group-hover:text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold mono">
                        {job.schedule}
                      </span>
                      {job.command.includes('.py') && <span className="text-[9px] text-yellow-500/60 font-bold uppercase tracking-wider">Python</span>}
                      {job.command.includes('.sh') && <span className="text-[9px] text-blue-500/60 font-bold uppercase tracking-wider">Shell</span>}
                    </div>
                    <p className="text-sm mono text-white truncate" title={job.command}>{job.command}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => runNow(job.command)}
                      disabled={runningJob === job.command}
                      className="p-2.5 rounded-xl bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 hover:bg-emerald-500/20 transition-all"
                      title="Run Now">
                      {runningJob === job.command ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                    </button>
                    <button onClick={() => removeJob(job.id)}
                      className="p-2.5 rounded-xl bg-rose-500/5 text-rose-500 border border-rose-500/10 hover:bg-rose-500/20 transition-all"
                      title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
