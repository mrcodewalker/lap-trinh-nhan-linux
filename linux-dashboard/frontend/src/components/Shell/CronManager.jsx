import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarClock, Plus, Trash2, RefreshCw, X, Check, Clock, Play } from 'lucide-react'
import api from '../../utils/api'

const PRESETS = [
  { label: 'Every minute',   value: '* * * * *' },
  { label: 'Every hour',     value: '0 * * * *' },
  { label: 'Every day 2am',  value: '0 2 * * *' },
  { label: 'Every Sunday',   value: '0 0 * * 0' },
  { label: 'Every month 1st',value: '0 0 1 * *' },
]

const FIELDS = ['minute','hour','dayOfMonth','month','dayOfWeek']
const FIELD_LABELS = ['Minute','Hour','Day/Month','Month','Day/Week']
const FIELD_HINTS  = ['0-59','0-23','1-31','1-12','0-7']

export default function CronManager() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ minute:'*', hour:'*', dayOfMonth:'*', month:'*', dayOfWeek:'*', command:'' })
  const [saving, setSaving]   = useState(false)

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
    const parts = preset.split(' ')
    setForm(f => ({ ...f, minute: parts[0], hour: parts[1], dayOfMonth: parts[2], month: parts[3], dayOfWeek: parts[4] }))
  }

  const addJob = async (e) => {
    e.preventDefault()
    if (!form.command.trim()) { setError('Command is required'); return }
    setSaving(true)
    try {
      await api.post('/shell/cron/add', form)
      setForm({ minute:'*', hour:'*', dayOfMonth:'*', month:'*', dayOfWeek:'*', command:'' })
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white/70">{jobs.length} scheduled jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadJobs} className="btn-ghost p-2">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> New Job
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl text-xs text-red-400 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          {error} <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.form onSubmit={addJob}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/70">New Cron Job</p>
              <button type="button" onClick={() => setShowForm(false)}><X size={15} className="text-white/30" /></button>
            </div>

            {/* Presets */}
            <div>
              <p className="text-xs text-white/30 mb-2">Quick presets</p>
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
                  <label className="text-[11px] text-white/35 block mb-1">{FIELD_LABELS[i]}</label>
                  <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="input text-center mono text-sm py-2" placeholder={FIELD_HINTS[i]} />
                </div>
              ))}
            </div>

            {/* Command */}
            <div>
              <label className="text-xs text-white/35 block mb-1">Command</label>
              <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
                className="input mono" placeholder="/usr/bin/backup.sh" />
            </div>

            {/* Preview */}
            <div className="code-block text-xs">
              <span className="text-white/30">Preview: </span>
              <span className="text-cyan-400">{cronPreview}</span>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center gap-1.5 disabled:opacity-40">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                Add Job
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Jobs list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-white/30">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarClock size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-xs text-white/30">No cron jobs scheduled</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-xs">
              <Plus size={12} className="inline mr-1" /> Add your first job
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {jobs.map((job, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.025] transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <Clock size={14} className="text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-mono truncate">{job.command}</p>
                  <p className="text-xs text-white/30 mt-0.5 font-mono">{job.schedule}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => removeJob(job.id)}
                    className="btn-danger py-1 px-2.5 text-xs flex items-center gap-1">
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
