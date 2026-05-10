import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Folder, Upload, Download, Trash2, Edit2, Lock } from 'lucide-react'
import api from '../../utils/api'

export default function FileManager() {
  const [files, setFiles] = useState([])
  const [currentDir, setCurrentDir] = useState('/home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadFiles()
  }, [currentDir])

  const loadFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/files/list', { params: { dir: currentDir } })
      setFiles(response.data.files)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete ${file.name}?`)) return

    try {
      await api.delete('/files/delete', {
        data: { file: `${currentDir}/${file.name}` }
      })
      loadFiles()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete file')
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-cyber-cyan/60">Current Directory</p>
            <p className="font-mono text-neon-green">{currentDir}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="p-2 rounded-lg hover:glass transition-smooth"
          >
            <Upload size={18} className="text-cyber-cyan" />
          </motion.button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm font-mono text-cyber-cyan/60">
          {currentDir.split('/').map((part, idx, arr) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              <button
                onClick={() => setCurrentDir('/' + arr.slice(1, idx + 1).join('/'))}
                className="hover:text-cyber-cyan transition-smooth"
              >
                {part || 'root'}
              </button>
            </React.Fragment>
          ))}
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

      {/* Files */}
      <div className="glass rounded-lg border border-cyber-cyan/20 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-cyber-cyan/60">Loading...</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-cyber-cyan/60">No files found</div>
        ) : (
          <div className="divide-y divide-cyber-cyan/10">
            {files.map((file, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-smooth"
              >
                <div className="flex items-center gap-3 flex-1">
                  {file.type === 'directory' ? (
                    <Folder size={18} className="text-cyber-cyan" />
                  ) : (
                    <FileText size={18} className="text-cyber-purple" />
                  )}
                  <div className="flex-1">
                    <p className="font-mono text-sm">{file.name}</p>
                    <p className="text-xs text-cyber-cyan/60">
                      {file.size} bytes • {new Date(file.modified).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyber-cyan/60">{file.permissions}</span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    className="p-1 rounded hover:glass transition-smooth"
                  >
                    <Lock size={14} className="text-cyber-cyan/60" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handleDelete(file)}
                    className="p-1 rounded hover:glass transition-smooth"
                  >
                    <Trash2 size={14} className="text-neon-pink/60" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
