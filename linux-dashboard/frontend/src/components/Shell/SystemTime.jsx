import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Globe, RefreshCw, Check, X } from 'lucide-react'
import api from '../../utils/api'

const TIMEZONES = [
  'UTC','America/New_York','America/Los_Angeles','America/Chicago',
  'Europe/London','Europe/Paris','Europe/Berlin',
  'Asia/Tokyo','Asia/Shanghai','Asia/Singapore','Asia/Ho_Chi_Minh',
  'Australia/Sydney','Pacific/Auckland',
]

export default function SystemTime() {
  const [now, setNow]           = useState(new Date())
  const [tzInfo, setTzInfo]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)
  const [newTz, setNewTz]       = useState('')
  const [newDatetime, setNewDatetime] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    loadTimeInfo()
    return () => clearInterval(t)
  }, [])

  const loadTimeInfo = async () => {
    setLoading(true)
    try {
      const r = await api.get('/shell/time/info')
      setTzInfo(r.data.timezone || '')
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load timezone')
    } finally { setLoading(false) }
  }

  const setTimezone = async () => {
    if (!newTz) return
    try {
      await api.post('/shell/time/timezone', { timezone: newTz })
      setSuccess(`Timezone set to ${newTz}`)
      setNewTz('')
      loadTimeInfo()
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) { setError(e.response?.data?.error || 'Failed to set timezone') }
  }

  const setDatetime = async () => {
    if (!newDatetime) return
    try {
      await api.post('/shell/time/set', { datetime: newDatetime })
      setSuccess('System time updated')
      setNewDatetime('')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) { setError(e.response?.data?.error || 'Failed to set time') }
  }

  const pad = n => String(n).padStart(2, '0')
  const h = pad(now.getHours()), m = pad(now.getMinutes()), s = pad(now.getSeconds())

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Big clock */}
      <div className="card p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          {[h, ':', m, ':', s].map((seg, i) => (
            <motion.span key={i}
              animate={seg === ':' ? {} : { opacity: [1, 0.6, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-5xl font-bold mono tabular-nums"
              style={{ color: seg === ':' ? 'var(--text3)' : 'var(--text)' }}>
              {seg}
            </motion.span>
          ))}
        </div>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          {now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>Unix Timestamp</p>
          <p className="mono text-sm" style={{ color: 'var(--accent)' }}>{Math.floor(now.getTime() / 1000)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>ISO 8601</p>
          <p className="mono text-xs truncate" style={{ color: 'var(--accent)' }}>{now.toISOString()}</p>
        </div>
      </div>

      {/* Timezone info */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
            Current Timezone Info
          </p>
          <button onClick={loadTimeInfo} className="btn-ghost p-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <pre className="code-block text-xs max-h-32 overflow-auto">{tzInfo || 'Loading...'}</pre>
      </div>

      {/* Set timezone */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
          Change Timezone
        </p>
        <div className="flex gap-2">
          <select value={newTz} onChange={e => setNewTz(e.target.value)}
            className="input flex-1" style={{ background: 'var(--input-bg)' }}>
            <option value="">Select timezone...</option>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          <button onClick={setTimezone} disabled={!newTz}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-40">
            <Globe size={13} /> Apply
          </button>
        </div>
      </div>

      {/* Set datetime */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
          Set Date & Time
        </p>
        <div className="flex gap-2">
          <input type="datetime-local" value={newDatetime} onChange={e => setNewDatetime(e.target.value)}
            className="input flex-1 mono" />
          <button onClick={setDatetime} disabled={!newDatetime}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-40">
            <Check size={13} /> Set
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--text3)' }}>⚠ Requires sudo privileges on the server</p>
      </div>

      {success && <div className="banner-success"><Check size={13} /> {success}</div>}
      {error && (
        <div className="banner-error">
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}
    </div>
  )
}
