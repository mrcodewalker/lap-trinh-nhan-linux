import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { Lock, User } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { login, loading, error } = useAuthStore()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await login(username, password)
    if (success) {
      navigate('/shell')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-dark via-cyber-navy to-cyber-dark flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full border border-cyber-purple/20"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full border border-cyber-cyan/20"
        />
      </div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass rounded-2xl border border-cyber-cyan/30 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.h1
              animate={{ textShadow: ['0 0 10px rgba(0, 245, 255, 0.5)', '0 0 20px rgba(157, 78, 221, 0.5)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl font-bold gradient-text mb-2"
            >
              LINUX
            </motion.h1>
            <p className="text-cyber-cyan/60 text-sm">System Programming Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm text-cyber-cyan/80 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-cyber-cyan/50" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/30 border border-cyber-cyan/30 rounded-lg focus:border-cyber-cyan focus:outline-none transition-smooth text-white placeholder-cyber-cyan/30"
                  placeholder="admin"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-cyber-cyan/80 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-cyber-cyan/50" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/30 border border-cyber-cyan/30 rounded-lg focus:border-cyber-cyan focus:outline-none transition-smooth text-white placeholder-cyber-cyan/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

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

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className="w-full py-2 rounded-lg bg-gradient-to-r from-cyber-cyan to-cyber-purple text-black font-semibold transition-smooth disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </motion.button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-lg bg-black/30 border border-cyber-purple/20">
            <p className="text-xs text-cyber-cyan/60 mb-2">Demo Credentials:</p>
            <p className="text-xs font-mono text-neon-green">admin / admin123</p>
            <p className="text-xs font-mono text-neon-green">user / user123</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
