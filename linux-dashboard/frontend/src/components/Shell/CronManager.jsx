import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Plus, Trash2, RefreshCw } from 'lucide-react'
import api from '../../utils/api'

export default function CronManager() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    minute: '*',
    hour: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
    command: ''
  })

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/cron/list')
      setJobs(response.data.jobs)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load cron jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleAddJob = async (e) => {
    e.preventDefault()
    if (!formData.command.trim()) {
      setError('Command is required')
      return
    }

    try {
      await api.post('/cron/add', formData)
      setFormData({
        minute: '*',
        hour: '*',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*',
        command: ''
      })
      setShowForm(false)
      loadJobs()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add cron job')
    }
  }

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Delete this cron job?')) return

    try {
      await api.delete('/cron/remove', { data: { id } })
      loadJobs()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete cron job')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="glass rounded-lg border border-cyber-cyan/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-cyber-cyan">Cron Jobs</h3>
            <p className="text-sm text-cyber-cyan/60">{jobs.length} jobs scheduled</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={loadJobs}
              className="p-2 rounded-lg hover:glass transition-smooth"
            >
              <RefreshCw size={18} className="text-cyber-cyan" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowForm(!showForm)}
              className="p-2 rounded-lg hover:glass transition-smooth bg-cyber-cyan/10"
            >
              <Plus size={18} className="text-cyber-cyan" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Add Job Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddJob}
          className="glass rounded-lg border border-cyber-cyan/20 p-4 space-y-4"
        >
          <div className="grid grid-cols-5 gap-2">
            {['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'].map((field) => (
              <div key={field}>
                <label className="text-xs text-cyber-cyan/60 capitalize">{field}</label>
                <input
                  type="text"
                  value={formData[field]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="w-full px-2 py-1 bg-black/30 border border-cyber-cyan/30 rounded text-sm focus:border-cyber-cyan focus:outline-none"
                  placeholder="*"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs text-cyber-cyan/60">Command</label>
            <input
              type="text"
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
              className="w-full px-3 py-2 bg-black/30 border border-cyber-cyan/30 rounded text-sm focus:border-cyber-cyan focus:outline-none font-mono"
              placeholder="/path/to/command"
            />
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              type="submit"
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyber-cyan to-cyber-purple text-black font-semibold transition-smooth"
            >
              Add Job
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg border border-cyber-cyan/30 text-cyber-cyan transition-smooth"
            >
              Cancel
            </motion.button>
          </div>
        </motion.form>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30 text-neon-pink text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Jobs List */}
      <div className="glass rounded-lg border border-cyber-cyan/20 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-cyber-cyan/60">Loading cron jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-cyber-cyan/60">No cron jobs scheduled</div>
        ) : (
          <div className="divide-y divide-cyber-cyan/10">
            {jobs.map((job, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-smooth"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Clock size={18} className="text-cyber-purple" />
                  <div className="flex-1">
                    <p className="font-mono text-sm text-neon-green">{job.command}</p>
                    <p className="text-xs text-cyber-cyan/60">
                      {job.minute} {job.hour} {job.dayOfMonth} {job.month} {job.dayOfWeek}
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => handleDeleteJob(job.id)}
                  className="p-2 rounded-lg hover:glass transition-smooth"
                >
                  <Trash2 size={16} className="text-neon-pink/60" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
