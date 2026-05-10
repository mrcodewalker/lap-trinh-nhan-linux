import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCw } from 'lucide-react'
import api from '../../utils/api'

const fmt = (bytes) => {
  const gb = bytes / (1024 ** 3)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="text-white/40 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value?.toFixed ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  )
}

export default function ResourceMonitor() {
  const [info, setInfo]       = useState(null)
  const [disks, setDisks]     = useState([])
  const [memHistory, setMemHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [])

  const load = async () => {
    try {
      const [resR, diskR] = await Promise.all([
        api.get('/process/resources'),
        api.get('/process/disk'),
      ])
      setInfo(resR.data)
      setDisks(diskR.data.disks || [])
      const usedPct = parseFloat(resR.data.memory?.percentage || 0)
      setMemHistory(prev => [...prev.slice(-19), {
        t: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        mem: usedPct,
        load: resR.data.loadAverage?.[0] || 0,
      }])
    } catch (e) { console.error('Resource load failed') }
  }

  if (!info) return <div className="py-12 text-center text-xs text-white/30">Loading resources...</div>

  const memPct = parseFloat(info.memory?.percentage || 0)

  const StatCard = ({ label, value, sub, color = '#22d3ee' }) => (
    <div className="card p-4">
      <p className="text-xs text-white/30 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-white/25 mt-1">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="CPU Cores" value={info.cpu?.count} sub={info.cpu?.model?.split(' ').slice(-2).join(' ')} color="#22d3ee" />
        <StatCard label="Memory Used" value={`${memPct}%`} sub={`${fmt(info.memory?.used)} / ${fmt(info.memory?.total)}`} color="#a78bfa" />
        <StatCard label="Uptime" value={`${(info.uptime / 3600).toFixed(1)}h`} sub={info.hostname} color="#34d399" />
        <StatCard label="Load Avg" value={info.loadAverage?.[0]?.toFixed(2)} sub={`${info.loadAverage?.[1]?.toFixed(2)} · ${info.loadAverage?.[2]?.toFixed(2)}`} color="#f472b6" />
      </div>

      {/* Memory chart */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Memory Usage %</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={memHistory}>
            <defs>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="mem" name="Memory %" stroke="#a78bfa" fill="url(#memGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Load average chart */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Load Average</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={memHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="load" name="Load" stroke="#22d3ee" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Disk usage */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Disk Usage</p>
        <div className="space-y-3">
          {disks.filter(d => d.filesystem && d.percentage).map((disk, i) => {
            const pct = parseInt(disk.percentage)
            const color = pct > 90 ? '#f87171' : pct > 70 ? '#fbbf24' : '#34d399'
            return (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-mono text-white/60 truncate max-w-[200px]">{disk.filesystem}</span>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{disk.used} / {disk.size}</span>
                    <span className="font-semibold" style={{ color }}>{disk.percentage}</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <motion.div className="progress-fill" initial={{ width: 0 }}
                    animate={{ width: disk.percentage }}
                    style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
