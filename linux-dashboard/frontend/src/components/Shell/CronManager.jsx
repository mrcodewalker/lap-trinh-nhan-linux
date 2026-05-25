import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarClock, Plus, Trash2, RefreshCw, X, Check, Clock, FileCode, Play, Eye, Copy } from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'

const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 min', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 2am', value: '0 2 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Every Sunday', value: '0 0 * * 0' },
  { label: 'Mon-Fri 9am', value: '0 9 * * 1-5' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
  { label: 'Every 30s (workaround)', value: '* * * * *' },
]

const SCRIPT_TEMPLATES = [
  {
    id: 'backup_files',
    label: '🗂️ Backup Files',
    desc: 'Backup a directory with timestamp',
    lang: 'bash',
    schedule: '0 2 * * *',
    content: `#!/bin/bash
# Backup script - runs daily at 2am
BACKUP_DIR="/home/user/backups"
SOURCE_DIR="/home/user/projects"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" "$SOURCE_DIR"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null
echo "[$(date)] Backup completed: backup_$TIMESTAMP.tar.gz"
`,
  },
  {
    id: 'cleanup_logs',
    label: '🧹 Cleanup Logs',
    desc: 'Remove old log files > 7 days',
    lang: 'bash',
    schedule: '0 3 * * *',
    content: `#!/bin/bash
# Log cleanup - remove files older than 7 days
LOG_DIRS=("/var/log/myapp" "/tmp/logs" "$HOME/.local/logs")

for dir in "\${LOG_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    find "$dir" -name "*.log" -mtime +7 -delete
    echo "[$(date)] Cleaned: $dir"
  fi
done

# Also truncate large log files (>100MB)
find /var/log -name "*.log" -size +100M -exec truncate -s 0 {} \\;
echo "[$(date)] Log cleanup completed"
`,
  },
  {
    id: 'system_health',
    label: '💊 System Health Check',
    desc: 'Monitor CPU, RAM, disk and alert',
    lang: 'bash',
    schedule: '*/10 * * * *',
    content: `#!/bin/bash
# System health check - every 10 minutes
REPORT_FILE="/tmp/health_report.txt"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=90
ALERT_THRESHOLD_DISK=85

echo "=== System Health Report $(date) ===" > "$REPORT_FILE"

# CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d. -f1)
echo "CPU Usage: $CPU_USAGE%" >> "$REPORT_FILE"

# Memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
echo "Memory Usage: $MEM_USAGE%" >> "$REPORT_FILE"

# Disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
echo "Disk Usage: $DISK_USAGE%" >> "$REPORT_FILE"

# Alerts
if [ "$CPU_USAGE" -gt "$ALERT_THRESHOLD_CPU" ]; then
  echo "⚠️  HIGH CPU: $CPU_USAGE%" >> "$REPORT_FILE"
fi
if [ "$MEM_USAGE" -gt "$ALERT_THRESHOLD_MEM" ]; then
  echo "⚠️  HIGH MEMORY: $MEM_USAGE%" >> "$REPORT_FILE"
fi
if [ "$DISK_USAGE" -gt "$ALERT_THRESHOLD_DISK" ]; then
  echo "⚠️  HIGH DISK: $DISK_USAGE%" >> "$REPORT_FILE"
fi

echo "--- Top 5 processes by CPU ---" >> "$REPORT_FILE"
ps aux --sort=-%cpu | head -6 >> "$REPORT_FILE"
cat "$REPORT_FILE"
`,
  },
  {
    id: 'python_monitor',
    label: '🐍 Python Monitor',
    desc: 'Python script for process monitoring',
    lang: 'python',
    schedule: '*/5 * * * *',
    content: `#!/usr/bin/env python3
"""Process monitor - check if critical services are running"""
import subprocess
import datetime
import os

SERVICES = ['nginx', 'mysql', 'redis-server', 'docker']
LOG_FILE = os.path.expanduser('~/.service_monitor.log')

def check_service(name):
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', name],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip() == 'active'
    except Exception:
        return False

def main():
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    report = []
    
    for svc in SERVICES:
        status = check_service(svc)
        icon = '✅' if status else '❌'
        report.append(f"  {icon} {svc}: {'running' if status else 'STOPPED'}")
        
        if not status:
            # Attempt restart
            subprocess.run(['sudo', 'systemctl', 'restart', svc], 
                         capture_output=True, timeout=10)
            report.append(f"     ↳ Attempted restart")
    
    log_entry = f"[{now}] Service Check:\\n" + "\\n".join(report) + "\\n"
    print(log_entry)
    
    with open(LOG_FILE, 'a') as f:
        f.write(log_entry)

if __name__ == '__main__':
    main()
`,
  },
  {
    id: 'network_check',
    label: '🌐 Network Watchdog',
    desc: 'Check connectivity and DNS resolution',
    lang: 'bash',
    schedule: '*/2 * * * *',
    content: `#!/bin/bash
# Network watchdog - check connectivity every 2 minutes
HOSTS=("8.8.8.8" "1.1.1.1" "google.com")
LOG="/tmp/network_watchdog.log"
INTERFACE="eth0"

echo "[$(date)] Network check started" >> "$LOG"

for host in "\${HOSTS[@]}"; do
  if ping -c 1 -W 3 "$host" > /dev/null 2>&1; then
    echo "  ✓ $host reachable" >> "$LOG"
  else
    echo "  ✗ $host UNREACHABLE" >> "$LOG"
    # Try to restart networking
    sudo systemctl restart NetworkManager 2>/dev/null
    echo "  ↳ NetworkManager restarted" >> "$LOG"
  fi
done

# Check DNS resolution
if nslookup google.com > /dev/null 2>&1; then
  echo "  ✓ DNS resolution OK" >> "$LOG"
else
  echo "  ✗ DNS FAILED - flushing cache" >> "$LOG"
  sudo systemd-resolve --flush-caches 2>/dev/null
fi

# Log interface stats
RX=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes 2>/dev/null || echo 0)
TX=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes 2>/dev/null || echo 0)
echo "  📊 $INTERFACE: RX=$(($RX/1024/1024))MB TX=$(($TX/1024/1024))MB" >> "$LOG"
`,
  },
  {
    id: 'disk_alert',
    label: '💾 Disk Space Alert',
    desc: 'Alert when disk usage exceeds threshold',
    lang: 'bash',
    schedule: '0 */4 * * *',
    content: `#!/bin/bash
# Disk space alert - check every 4 hours
THRESHOLD=80
ALERT_FILE="/tmp/disk_alert.txt"

echo "=== Disk Space Report $(date) ===" > "$ALERT_FILE"

df -h | grep -E '^/dev/' | while read line; do
  USAGE=$(echo "$line" | awk '{print $5}' | tr -d '%')
  MOUNT=$(echo "$line" | awk '{print $6}')
  AVAIL=$(echo "$line" | awk '{print $4}')
  
  if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "⚠️  WARNING: $MOUNT at $USAGE% (Available: $AVAIL)" >> "$ALERT_FILE"
    # Find largest files in that mount
    echo "   Top 5 largest files:" >> "$ALERT_FILE"
    find "$MOUNT" -xdev -type f -size +100M 2>/dev/null | head -5 | while read f; do
      SIZE=$(du -h "$f" 2>/dev/null | cut -f1)
      echo "     $SIZE  $f" >> "$ALERT_FILE"
    done
  else
    echo "✓ $MOUNT: $USAGE% used (Available: $AVAIL)" >> "$ALERT_FILE"
  fi
done

cat "$ALERT_FILE"
`,
  },
]

const FIELDS = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
const FIELD_LABELS = ['Minute', 'Hour', 'Day/Month', 'Month', 'Day/Week']
const FIELD_HINTS = ['0-59', '0-23', '1-31', '1-12', '0-7 (0=Sun)']

export default function CronManager() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [previewScript, setPreviewScript] = useState(null)
  const [form, setForm] = useState({
    minute: '*', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*',
    command: '', mode: 'cmd', scriptContent: '', scriptLang: 'bash'
  })
  const [saving, setSaving] = useState(false)

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

  const applyTemplate = (template) => {
    const [m, h, dom, mo, dow] = template.schedule.split(' ')
    setForm(f => ({
      ...f,
      minute: m, hour: h, dayOfMonth: dom, month: mo, dayOfWeek: dow,
      mode: 'script',
      scriptContent: template.content,
      scriptLang: template.lang,
      command: ''
    }))
    setShowTemplates(false)
    setShowForm(true)
  }

  const addJob = async (e) => {
    e.preventDefault()

    let finalCommand = form.command

    if (form.mode === 'script') {
      if (!form.scriptContent.trim()) { setError('Script content is required'); return }
      setSaving(true)
      try {
        const ext = form.scriptLang === 'python' ? '.py' : '.sh'
        const scriptName = `cron_${Date.now()}${ext}`
        const r = await api.post('/shell/scripts/save', {
          name: scriptName,
          content: form.scriptContent
        })
        finalCommand = form.scriptLang === 'python'
          ? `python3 ${r.data.path}`
          : `bash ${r.data.path}`
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
        minute: '*', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*',
        command: '', mode: 'cmd', scriptContent: '', scriptLang: 'bash'
      })
      setShowForm(false)
      setSuccess('Cron job scheduled successfully!')
      setTimeout(() => setSuccess(null), 3000)
      loadJobs()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add cron job')
    } finally { setSaving(false) }
  }

  const removeJob = async (id) => {
    if (!confirm('Remove this cron job?')) return
    try {
      await api.post('/shell/cron/remove', { id })
      setSuccess('Job removed')
      setTimeout(() => setSuccess(null), 2000)
      loadJobs()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to remove cron job')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setSuccess('Copied to clipboard!')
    setTimeout(() => setSuccess(null), 1500)
  }

  const scheduleDescription = useMemo(() => {
    const { minute: m, hour: h, dayOfMonth: dom, month: mo, dayOfWeek: dow } = form
    if (m === '*' && h === '*' && dom === '*' && mo === '*' && dow === '*') return 'Every minute'
    if (m === '0' && h === '*') return 'Every hour at :00'
    if (m === '0' && h === '0' && dom === '*' && dow === '*') return 'Daily at midnight'
    if (dow !== '*' && m !== '*' && h !== '*') return `At ${h}:${m.padStart(2, '0')} on day ${dow}`
    if (m !== '*' && h !== '*' && dom === '*') return `Daily at ${h}:${m.padStart(2, '0')}`
    return `${m} ${h} ${dom} ${mo} ${dow}`
  }, [form])

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
          {jobs.length} scheduled jobs
        </p>
        <div className="flex items-center gap-2">
          <button onClick={loadJobs} className="btn-ghost p-2">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowTemplates(v => !v)}
            className="btn-ghost flex items-center gap-1.5 text-sm"
            style={showTemplates ? { color: 'var(--accent)', borderColor: 'rgba(34,211,238,0.3)' } : {}}>
            <FileCode size={14} /> Templates
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
      {success && (
        <div className="banner-success">
          {success}
        </div>
      )}

      {/* Script Templates Gallery */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📋 Script Templates</p>
                <button onClick={() => setShowTemplates(false)}><X size={14} style={{ color: 'var(--text3)' }} /></button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>
                Click a template to auto-fill the form with a ready-to-use script
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {SCRIPT_TEMPLATES.map(t => (
                  <div key={t.id} className="p-3 rounded-xl transition-all cursor-pointer group"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    onClick={() => applyTemplate(t)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{t.label}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: t.lang === 'python' ? 'rgba(59,130,246,0.12)' : 'rgba(52,211,153,0.12)',
                          color: t.lang === 'python' ? '#3b82f6' : 'var(--green)',
                          border: `1px solid ${t.lang === 'python' ? 'rgba(59,130,246,0.2)' : 'rgba(52,211,153,0.2)'}`,
                        }}>
                        {t.lang.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] mb-2" style={{ color: 'var(--text3)' }}>{t.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] mono" style={{ color: 'var(--accent)' }}>{t.schedule}</span>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setPreviewScript(t) }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--accent)' }}>
                          <Eye size={11} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(t.content) }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--text3)' }}>
                          <Copy size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Script Preview Modal */}
      <AnimatePresence>
        {previewScript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop" onClick={() => setPreviewScript(null)}>
            <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{previewScript.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>{previewScript.desc} • Schedule: {previewScript.schedule}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { applyTemplate(previewScript); setPreviewScript(null) }}
                    className="btn-primary text-xs flex items-center gap-1.5">
                    <Play size={12} /> Use This
                  </button>
                  <button onClick={() => setPreviewScript(null)}><X size={16} style={{ color: 'var(--text3)' }} /></button>
                </div>
              </div>
              <div className="terminal-wrap" style={{ maxHeight: 400 }}>
                <div className="terminal-header">
                  <span className="terminal-dot bg-red-400/60" />
                  <span className="terminal-dot bg-yellow-400/60" />
                  <span className="terminal-dot bg-green-400/60" />
                  <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>
                    {previewScript.lang === 'python' ? 'script.py' : 'script.sh'}
                  </span>
                </div>
                <pre className="p-4 text-xs mono overflow-auto" style={{ background: 'var(--code-bg)', color: 'var(--code-text)', maxHeight: 340 }}>
                  {previewScript.content}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                  <button key={p.value} type="button" onClick={() => applyPreset(p.value)}
                    className="btn-ghost py-1 px-2.5 text-[11px]">{p.label}</button>
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

            {/* Human-readable schedule */}
            <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
              style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.12)' }}>
              <Clock size={12} style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--accent)' }}>{scheduleDescription}</span>
            </div>

            {/* Command / Script Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs block" style={{ color: 'var(--text3)' }}>Task Execution</label>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setForm(f => ({ ...f, mode: 'cmd' }))}
                    className={clsx("text-[10px] font-bold px-2.5 py-1 rounded transition-all", form.mode === 'cmd' ? "bg-cyan-500 text-black" : "bg-white/5 text-white/30")}>
                    COMMAND
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, mode: 'script', scriptLang: 'bash' }))}
                    className={clsx("text-[10px] font-bold px-2.5 py-1 rounded transition-all", form.mode === 'script' && form.scriptLang === 'bash' ? "bg-emerald-500 text-black" : "bg-white/5 text-white/30")}>
                    BASH SCRIPT
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, mode: 'script', scriptLang: 'python' }))}
                    className={clsx("text-[10px] font-bold px-2.5 py-1 rounded transition-all", form.mode === 'script' && form.scriptLang === 'python' ? "bg-blue-500 text-white" : "bg-white/5 text-white/30")}>
                    PYTHON
                  </button>
                </div>
              </div>

              {form.mode === 'script' ? (
                <div className="space-y-2">
                  <div className="terminal-wrap" style={{ height: '220px' }}>
                    <div className="terminal-header">
                      <span className="terminal-dot bg-red-400/60" />
                      <span className="terminal-dot bg-yellow-400/60" />
                      <span className="terminal-dot bg-green-400/60" />
                      <span className="text-[10px] ml-2 mono" style={{ color: 'var(--text3)' }}>
                        {form.scriptLang === 'python' ? 'task.py' : 'task.sh'}
                      </span>
                      <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: form.scriptLang === 'python' ? 'rgba(59,130,246,0.15)' : 'rgba(52,211,153,0.15)',
                          color: form.scriptLang === 'python' ? '#60a5fa' : '#34d399',
                        }}>
                        {form.scriptLang.toUpperCase()}
                      </span>
                    </div>
                    <textarea
                      value={form.scriptContent || (form.scriptLang === 'python'
                        ? '#!/usr/bin/env python3\n\nimport datetime\n\nprint(f"Task executed at {datetime.datetime.now()}")\n# Add your Python logic here\n'
                        : '#!/bin/bash\n\necho "Task executed at $(date)"\n# Add your shell commands here\n'
                      )}
                      onChange={e => setForm(f => ({ ...f, scriptContent: e.target.value }))}
                      className="w-full h-[175px] p-4 text-xs mono outline-none resize-none leading-relaxed"
                      style={{ background: 'var(--code-bg)', color: 'var(--code-text)' }}
                      spellCheck={false}
                    />
                  </div>
                  <p className="text-[10px] italic" style={{ color: 'var(--text3)' }}>
                    Script will be saved to ~/.dashboard_scripts/ and scheduled automatically.
                  </p>
                </div>
              ) : (
                <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
                  className="input mono" placeholder="e.g. /usr/bin/python3 /path/to/app.py  or  systemctl restart nginx" />
              )}
            </div>

            {/* Preview */}
            <div className="code-block text-xs">
              <span style={{ color: 'var(--text3)' }}>crontab: </span>
              <span style={{ color: 'var(--accent)' }}>
                {form.minute} {form.hour} {form.dayOfMonth} {form.month} {form.dayOfWeek}{' '}
                {form.mode === 'script'
                  ? `${form.scriptLang === 'python' ? 'python3' : 'bash'} ~/.dashboard_scripts/[auto].${form.scriptLang === 'python' ? 'py' : 'sh'}`
                  : (form.command || '[command]')}
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
            <p className="text-xs mb-2" style={{ color: 'var(--text3)' }}>No cron jobs scheduled</p>
            <p className="text-[10px] mb-4" style={{ color: 'var(--text3)' }}>
              Use templates above or create a custom job
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowTemplates(true)} className="btn-ghost text-xs flex items-center gap-1.5">
                <FileCode size={12} /> Browse Templates
              </button>
              <button onClick={() => setShowForm(true)} className="btn-primary text-xs">
                <Plus size={12} className="inline mr-1" /> Create Job
              </button>
            </div>
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs mono" style={{ color: 'var(--accent)' }}>{job.schedule}</span>
                    {job.command?.includes('.py') && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>PY</span>
                    )}
                    {job.command?.includes('.sh') && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>SH</span>
                    )}
                  </div>
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
