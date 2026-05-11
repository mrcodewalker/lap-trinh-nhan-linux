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
  const [renaming, setRenaming] = useState(null) // { oldName: '', newName: '' }

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

  const handleRename = async () => {
    if (!renaming.newName.trim() || renaming.newName === renaming.oldName) {
      setRenaming(null)
      return
    }
    try {
      const oldPath = `${currentDir}/${renaming.oldName}`.replace(/\/+/g, '/')
      const newPath = `${currentDir}/${renaming.newName}`.replace(/\/+/g, '/')
      await api.post('/shell/files/rename', { oldPath, newPath })
      setRenaming(null)
      loadFiles()
    } catch (err) {
      setError(err.response?.data?.error || 'Rename failed')
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
            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all shadow-lg"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold flex items-center gap-2 text-white/90">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <HardDrive size={12} className="text-cyan-400" />
              </div>
              File Explorer
            </h2>
            <div className="flex items-center gap-1 text-[9px] font-bold font-mono text-white/20 mt-0.5">
              {currentDir.split('/').filter(Boolean).reduce((acc, part, i) => {
                const path = '/' + currentDir.split('/').filter(Boolean).slice(0, i + 1).join('/')
                return [...acc, { name: part, path }]
              }, [{ name: 'ROOT', path: '/' }]).map((b, i, arr) => (
                <React.Fragment key={b.path}>
                  <button onClick={() => loadFiles(b.path)} className="hover:text-cyan-400 transition-colors uppercase tracking-widest">
                    {b.name}
                  </button>
                  {i < arr.length - 1 && <ChevronRight size={8} className="opacity-40" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter current view..."
              className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-2xl text-[11px] focus:outline-none focus:border-cyan-400/50 w-48 transition-all"
            />
          </div>
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
            <button 
              onClick={() => setViewMode('list')}
              className={clsx("p-1.5 rounded-xl transition-all", viewMode === 'list' ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "hover:bg-white/5 text-white/40")}
            >
              <List size={14} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={clsx("p-1.5 rounded-xl transition-all", viewMode === 'grid' ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "hover:bg-white/5 text-white/40")}
            >
              <Grid size={14} />
            </button>
          </div>
          <button 
            onClick={() => loadFiles()}
            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 shadow-lg"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-cyan-400" : ""} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* File List/Grid */}
        <div className={clsx(
          "flex-1 bg-black/40 border border-white/5 rounded-3xl overflow-auto custom-scrollbar p-6 shadow-2xl",
          viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 content-start" : "flex flex-col gap-1.5"
        )}>
          {loading && files.length === 0 ? (
            <div className="col-span-full h-full flex flex-col items-center justify-center text-white/20 gap-3">
              <div className="relative">
                <HardDrive size={48} className="opacity-10" />
                <RefreshCw size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-cyan-500" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/50">Accessing File System</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="col-span-full h-full flex flex-col items-center justify-center text-white/10 gap-4">
              <div className="w-20 h-20 rounded-3xl border-2 border-dashed border-white/5 flex items-center justify-center">
                <Folder size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/20 tracking-widest uppercase">Empty Folder</p>
                <p className="text-[9px] uppercase tracking-wider text-white/10 mt-1">Ready for your files</p>
              </div>
            </div>
          ) : (
            filteredFiles.map((file, idx) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.01 }}
                onClick={() => setSelected(file)}
                onDoubleClick={() => handleNavigate(file)}
                className={clsx(
                  "group relative cursor-pointer transition-all duration-300",
                  viewMode === 'grid' 
                    ? clsx(
                        "flex flex-col items-center p-5 rounded-3xl border shadow-xl",
                        selected?.name === file.name 
                          ? "bg-cyan-500/10 border-cyan-500/40 shadow-cyan-500/5 scale-105" 
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-1"
                      )
                    : clsx(
                        "flex items-center p-4 rounded-2xl border",
                        selected?.name === file.name 
                          ? "bg-cyan-500/10 border-cyan-500/30" 
                          : "bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/10"
                      )
                )}
              >
                <div className={clsx(
                  "transition-transform duration-300 group-hover:scale-110",
                  viewMode === 'grid' ? "mb-4" : "mr-4"
                )}>
                  {getFileIcon(file)}
                </div>
                
                <div className={clsx("flex-1 min-w-0", viewMode === 'grid' ? "text-center" : "")}>
                  <p className="text-xs font-bold truncate text-white/80 group-hover:text-cyan-400 transition-colors">
                    {file.name}
                  </p>
                  <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-1">
                    {file.type === 'directory' ? 'Folder' : formatSize(file.size)}
                  </p>
                </div>

                {viewMode === 'list' && (
                  <div className="hidden md:flex items-center gap-8 mr-6 text-[9px] font-bold font-mono text-white/10 uppercase tracking-widest">
                    <span>{file.permissions}</span>
                    <span>{new Date(file.modified).toLocaleDateString()}</span>
                  </div>
                )}

                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                  className="absolute right-3 top-3 p-1.5 rounded-xl bg-red-500/0 hover:bg-red-500/20 text-red-500/0 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
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
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="w-80 bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Object Metadata</h3>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col items-center gap-5 py-6 bg-white/[0.02] rounded-3xl border border-white/5">
                <div className="w-24 h-24 rounded-3xl bg-black/40 flex items-center justify-center shadow-2xl border border-white/5 relative overflow-hidden group">
                  {React.cloneElement(getFileIcon(selected), { size: 40 })}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-center overflow-hidden w-full px-4">
                  <p className="text-sm font-bold text-white/90 truncate leading-tight">{selected.name}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-bold uppercase tracking-widest border border-cyan-500/20">
                      {selected.type}
                    </span>
                    <span className="text-[9px] text-white/20 font-bold uppercase">{selected.permissions}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: 'Total Size', value: selected.type === 'directory' ? 'Calculating...' : formatSize(selected.size), icon: Info },
                  { label: 'Last Modified', value: new Date(selected.modified).toLocaleString(), icon: RefreshCw },
                  { label: 'Owner UID', value: '0 (root)', icon: HardDrive },
                ].map(item => (
                  <div key={item.label} className="flex flex-col gap-1.5 group">
                    <div className="flex items-center gap-1.5">
                      <item.icon size={10} className="text-white/20" />
                      <span className="text-[9px] uppercase text-white/20 font-bold tracking-widest">{item.label}</span>
                    </div>
                    <span className="text-xs text-white/70 font-mono pl-4 group-hover:text-cyan-400 transition-colors">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-white/5">
                <button className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-cyan-500 text-black text-[11px] font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                  <Download size={14} /> Download File
                </button>
                <button 
                  onClick={() => setRenaming({ oldName: selected.name, newName: selected.name })}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[11px] font-bold hover:bg-white/10 transition-all active:scale-95"
                >
                  <Edit2 size={14} /> Rename Item
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rename Modal */}
      <AnimatePresence>
        {renaming && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-backdrop z-50" onClick={() => setRenaming(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="modal-box max-w-sm border-white/10 p-8 text-center" onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
                <Edit2 size={24} className="text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold mb-1">Rename Item</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-6">Changing {renaming.oldName}</p>
              
              <input 
                autoFocus
                value={renaming.newName}
                onChange={e => setRenaming({ ...renaming, newName: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-mono text-cyan-400 focus:border-cyan-500/50 outline-none mb-6 text-center shadow-inner"
              />

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setRenaming(null)} className="btn-ghost py-3 rounded-2xl text-xs font-bold">Cancel</button>
                <button onClick={handleRename} className="btn-primary py-3 rounded-2xl text-xs font-bold">Apply Name</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Stats */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-[9px] text-white/20 uppercase font-bold tracking-[0.2em] backdrop-blur-md">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> {files.length} ITEMS</span>
          <span className="hidden sm:inline-block">{files.filter(f => f.type === 'directory').length} DIRECTORIES</span>
          <span className="hidden sm:inline-block">{files.filter(f => f.type !== 'directory').length} FILES</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx("flex items-center gap-1.5 transition-colors", loading ? "text-yellow-400" : "text-emerald-400")}>
             <div className={clsx("w-1.5 h-1.5 rounded-full", loading ? "bg-yellow-400 animate-pulse" : "bg-emerald-500")} />
             DISK {loading ? 'INDEXING' : 'IDLE'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
