import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, Folder, Upload, Download, Trash2, Edit2, 
  Lock, Search, ArrowLeft, MoreVertical, Grid, List, 
  ChevronRight, HardDrive, FilePlus, FolderPlus, RefreshCw, 
  Info, ExternalLink, X, FileCode, Image as ImageIcon,
  FileJson, FileArchive
} from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'

const getFileIcon = (file) => {
  if (file.type === 'directory') return <Folder size={20} className="text-cyan-400" />
  const ext = file.name.split('.').pop().toLowerCase()
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'c', 'h', 'cpp', 'sh'].includes(ext)) 
    return <FileCode size={20} className="text-purple-400" />
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) 
    return <ImageIcon size={20} className="text-green-400" />
  if (ext === 'json') return <FileJson size={20} className="text-yellow-400" />
  if (['zip', 'tar', 'gz', 'rar'].includes(ext)) 
    return <FileArchive size={20} className="text-orange-400" />
  return <FileText size={20} className="text-slate-400" />
}

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function FileManager() {
  const [files, setFiles] = useState([])
  const [currentDir, setCurrentDir] = useState('/home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'grid'
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const loadFiles = useCallback(async (dir = currentDir) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/shell/files/list', { params: { dir } })
      setFiles(response.data.files || [])
      setCurrentDir(dir)
      setSelected(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to access directory')
    } finally {
      setLoading(false)
    }
  }, [currentDir])

  useEffect(() => {
    loadFiles()
  }, [])

  const handleNavigate = (file) => {
    if (file.type === 'directory') {
      loadFiles(`${currentDir}/${file.name}`.replace(/\/+/g, '/'))
    }
  }

  const handleBack = () => {
    const parts = currentDir.split('/').filter(Boolean)
    if (parts.length === 0) return
    const parent = '/' + parts.slice(0, -1).join('/')
    loadFiles(parent)
  }

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) return
    try {
      await api.post('/shell/files/delete', { file: `${currentDir}/${file.name}`.replace(/\/+/g, '/') })
      loadFiles()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete')
    }
  }

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-4 max-h-[calc(100vh-180px)]"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleBack}
            disabled={currentDir === '/' || loading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <HardDrive size={14} className="text-cyan-400" />
              File Explorer
            </h2>
            <div className="flex items-center gap-1 text-[10px] font-mono text-white/40">
              {currentDir.split('/').filter(Boolean).reduce((acc, part, i) => {
                const path = '/' + currentDir.split('/').filter(Boolean).slice(0, i + 1).join('/')
                return [...acc, { name: part, path }]
              }, [{ name: 'root', path: '/' }]).map((b, i, arr) => (
                <React.Fragment key={b.path}>
                  <button onClick={() => loadFiles(b.path)} className="hover:text-cyan-400 transition-colors uppercase">
                    {b.name}
                  </button>
                  {i < arr.length - 1 && <ChevronRight size={10} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/50 w-48 transition-all"
            />
          </div>
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-white/5 text-white/40")}
            >
              <List size={14} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-white/5 text-white/40")}
            >
              <Grid size={14} />
            </button>
          </div>
          <button 
            onClick={() => loadFiles()}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* File List/Grid */}
        <div className={clsx(
          "flex-1 bg-black/20 border border-white/5 rounded-2xl overflow-auto custom-scrollbar p-4",
          viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start" : "flex flex-col gap-1"
        )}>
          {loading && files.length === 0 ? (
            <div className="col-span-full h-full flex flex-col items-center justify-center text-white/20 gap-3">
              <RefreshCw size={32} className="animate-spin" />
              <span className="text-xs uppercase tracking-widest">Scanning Disk...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="col-span-full h-full flex flex-col items-center justify-center text-white/20 gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                <Folder size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Empty Directory</p>
                <p className="text-[10px] uppercase tracking-wider">No files found matching your search</p>
              </div>
            </div>
          ) : (
            filteredFiles.map((file, idx) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => setSelected(file)}
                onDoubleClick={() => handleNavigate(file)}
                className={clsx(
                  "group relative cursor-pointer transition-all",
                  viewMode === 'grid' 
                    ? clsx(
                        "flex flex-col items-center p-4 rounded-2xl border hover:shadow-2xl hover:shadow-cyan-500/5",
                        selected?.name === file.name 
                          ? "bg-cyan-500/10 border-cyan-500/30" 
                          : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
                      )
                    : clsx(
                        "flex items-center p-3 rounded-xl border",
                        selected?.name === file.name 
                          ? "bg-cyan-500/10 border-cyan-500/30" 
                          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
                      )
                )}
              >
                <div className={clsx(viewMode === 'grid' ? "mb-3" : "mr-4")}>
                  {getFileIcon(file)}
                </div>
                
                <div className={clsx("flex-1 min-w-0", viewMode === 'grid' ? "text-center" : "")}>
                  <p className="text-xs font-medium truncate text-white/90 group-hover:text-cyan-400 transition-colors">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-white/30 uppercase tracking-tighter">
                    {file.type === 'directory' ? 'Folder' : formatSize(file.size)}
                  </p>
                </div>

                {viewMode === 'list' && (
                  <div className="hidden md:flex items-center gap-6 mr-4 text-[10px] font-mono text-white/20 uppercase">
                    <span>{file.permissions}</span>
                    <span>{new Date(file.modified).toLocaleDateString()}</span>
                  </div>
                )}

                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                  className="absolute right-2 top-2 p-1.5 rounded-lg bg-red-500/0 hover:bg-red-500/20 text-red-500/0 hover:text-red-400 group-hover:text-red-500/40 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))
          )}
        </div>

        {/* Sidebar Info */}
        <AnimatePresence>
          {selected && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-72 bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Item Properties</h3>
                <button onClick={() => setSelected(null)} className="text-white/20 hover:text-white"><X size={14} /></button>
              </div>

              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner">
                  {React.cloneElement(getFileIcon(selected), { size: 36 })}
                </div>
                <div className="text-center overflow-hidden w-full">
                  <p className="text-sm font-bold truncate px-2">{selected.name}</p>
                  <p className="text-xs text-cyan-400/60 font-mono mt-1 uppercase tracking-tighter">{selected.type}</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Size', value: selected.type === 'directory' ? '--' : formatSize(selected.size) },
                  { label: 'Modified', value: new Date(selected.modified).toLocaleString() },
                  { label: 'Permissions', value: selected.permissions },
                  { label: 'Owner', value: 'root' },
                ].map(item => (
                  <div key={item.label} className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-white/20 font-bold">{item.label}</span>
                    <span className="text-xs text-white/70 font-mono">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition-all">
                  <Download size={14} /> Get
                </button>
                <button className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all">
                  <Edit2 size={14} /> Edit
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Stats */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] text-white/30 uppercase font-bold tracking-widest">
        <div className="flex items-center gap-4">
          <span>{files.length} Total Items</span>
          <span>{files.filter(f => f.type === 'directory').length} Folders</span>
          <span>{files.filter(f => f.type !== 'directory').length} Files</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx("w-2 h-2 rounded-full", loading ? "bg-yellow-400 animate-pulse" : "bg-green-500")} />
          <span>System {loading ? 'Busy' : 'Ready'}</span>
        </div>
      </div>
    </motion.div>
  )
}
