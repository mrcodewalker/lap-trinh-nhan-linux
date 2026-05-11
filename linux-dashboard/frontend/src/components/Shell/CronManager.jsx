import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarClock, Plus, Trash2, RefreshCw, X, Check, Clock } from 'lucide-react'
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
        const r = await api.post('/shell/scripts/save', { 
          name: scriptName, 
          content: form.scriptContent 
        })
        finalCommand = `bash ${r.data.path}`
      } catch (e) {
        setError('Failed to save script: ' + (e.response?.data?.error || e.message))
        setSaving(false)
        return
      }
    } else if (!finalCommand.trim()) {
      setError('Command is required')
      return
    }

    setSaving(true)
    try {
      await api.post('/shell/cron/add', { ...form, command: finalCommand })
      setForm({ 
        minute:'*', hour:'*', dayOfMonth:'*', month:'*', dayOfWeek:'*', 
        command:'', mode: 'cmd', scriptContent: '' 
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
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
          {jobs.length} scheduled jobs
        </p>
        <div className="flex items-center gap-2">
          <button onClick={loadJobs} className="btn-ghost p-2">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> New Job
          </button>
        </div>
      </div>

      {error && (
        <div className="banner-error">
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.form onSubmit={addJob}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>New Scheduled Task</p>
              <button type="button" onClick={() => setShowForm(false)}>
                <X size={15} style={{ color: 'var(--text3)' }} />
              </button>
            </div>

            {/* Presets */}
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text3)' }}>Quick presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <button key={p.value} type="button" onClick={() => applyPreset(p.value)}
                    className="btn-ghost py-1 px-3 text-xs">{p.label}</button>
                ))}
              </div>
            </div>

            {/* Schedule fields */}
            <div className="grid grid-cols-5 gap-2">
              {FIELDS.map((field, i) => (
                <div key={field}>
                  <label className="text-[11px] block mb-1" style={{ color: 'var(--text3)' }}>
                    {FIELD_LABELS[i]}
                  </label>
                  <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="input text-center mono text-sm py-2" placeholder={FIELD_HINTS[i]} />
                </div>
              ))}
            </div>

            {/* Command / Script Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs block" style={{ color: 'var(--text3)' }}>Task Execution</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, mode: 'cmd' }))}
                    className={clsx("text-[10px] font-bold px-2 py-0.5 rounded transition-all", form.mode === 'cmd' ? "bg-cyan-500 text-black" : "bg-white/5 text-white/30")}>
                    SINGLE COMMAND
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, mode: 'script' }))}
                    className={clsx("text-[10px] font-bold px-2 py-0.5 rounded transition-all", form.mode === 'script' ? "bg-cyan-500 text-black" : "bg-white/5 text-white/30")}>
                    SHELL SCRIPT
                  </button>
                </div>
              </div>

              {form.mode === 'script' ? (
                <div className="space-y-2">
                  <div className="terminal-wrap" style={{ height: '200px' }}>
                    <div className="terminal-header">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500/40" />
                        <span className="w-2 h-2 rounded-full bg-yellow-500/40" />
                        <span className="w-2 h-2 rounded-full bg-green-500/40" />
                      </div>
                      <span className="text-[10px] ml-2 text-white/20 mono">script_editor.sh</span>
                    </div>
                    <textarea 
                      value={form.scriptContent || '#!/bin/bash\n\necho "Current time: $(date)"\n# Add your multi-line shell script here'} 
                      onChange={e => setForm(f => ({ ...f, scriptContent: e.target.value }))}
                      className="w-full h-[160px] bg-[#0a0b10] p-4 text-xs mono text-cyan-400 outline-none resize-none leading-relaxed"
                    />
                  </div>
                  <p className="text-[10px] text-white/20 italic">Note: The script will be saved and scheduled automatically.</p>
                </div>
              ) : (
                <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
                  className="input mono" placeholder="e.g. /usr/bin/python3 /path/to/app.py" />
              )}
            </div>

            {/* Preview */}
            <div className="code-block text-xs">
              <span style={{ color: 'var(--text3)' }}>Preview: </span>
              <span style={{ color: 'var(--accent)' }}>
                {form.minute} {form.hour} {form.dayOfMonth} {form.month} {form.dayOfWeek} {form.mode === 'script' ? 'bash [generated_script].sh' : (form.command || '[command]')}
              </span>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center gap-1.5 disabled:opacity-40">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                Schedule Task
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Jobs list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs" style={{ color: 'var(--text3)' }}>Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarClock size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
            <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>No cron jobs scheduled</p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-xs">
              <Plus size={12} className="inline mr-1" /> Add your first job
            </button>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border2)' }}>
            {jobs.map((job, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-4 py-3 group"
                style={{ borderBottom: '1px solid var(--border2)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                  <Clock size={14} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm mono truncate" style={{ color: 'var(--text)' }}>{job.command}</p>
                  <p className="text-xs mt-0.5 mono" style={{ color: 'var(--text3)' }}>{job.schedule}</p>
                </div>
                <button onClick={() => removeJob(job.id)}
                  className="btn-danger py-1 px-2.5 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={11} /> Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
