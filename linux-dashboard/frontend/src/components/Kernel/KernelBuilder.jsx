import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, Upload, Download, RefreshCw, CheckCircle,
  AlertCircle, X, Zap, FolderOpen, Trash2, Terminal,
  ChevronRight, Info, Package, HardDrive, FileText, Cpu
} from 'lucide-react'
import api from '../../utils/api'
import { useSocketStore } from '../../store/socketStore'
import ActivityLog from '../ActivityLog/ActivityLog'

// ── Inline templates ──────────────────────────────────────────────────────
const BUILTIN = {
  hello: {
    label: 'Hello World',
    modName: 'hello_module',
    desc: 'Basic init/exit, printk, module params',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Hello World Kernel Module");
MODULE_VERSION("1.0");

static char *greeting = "Hello";
module_param(greeting, charp, 0444);
MODULE_PARM_DESC(greeting, "Greeting string (default: Hello)");

static int __init hello_init(void) {
    printk(KERN_INFO "hello_module: %s from kernel!\\n", greeting);
    return 0;
}

static void __exit hello_exit(void) {
    printk(KERN_INFO "hello_module: unloaded\\n");
}

module_init(hello_init);
module_exit(hello_exit);`,
  },
  chardev: {
    label: 'Char Device',
    modName: 'chardev_module',
    desc: 'Register /dev/ char device with major ID',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Character Device with Major ID");
MODULE_VERSION("1.0");

#define DEVICE_NAME "chardev_module"
#define BUF_LEN 256

static int major_num;
static char msg_buffer[BUF_LEN];
static int msg_len = 0;
static int open_count = 0;

static int dev_open(struct inode *inode, struct file *file) {
    open_count++;
    printk(KERN_INFO "chardev: opened %d time(s)\\n", open_count);
    return 0;
}

static int dev_release(struct inode *inode, struct file *file) {
    printk(KERN_INFO "chardev: closed\\n");
    return 0;
}

static ssize_t dev_read(struct file *file, char __user *buf, size_t len, loff_t *offset) {
    int bytes_read = 0;
    if (*offset >= msg_len) return 0;
    bytes_read = min(len, (size_t)(msg_len - *offset));
    if (copy_to_user(buf, msg_buffer + *offset, bytes_read)) return -EFAULT;
    *offset += bytes_read;
    return bytes_read;
}

static ssize_t dev_write(struct file *file, const char __user *buf, size_t len, loff_t *offset) {
    int bytes = min(len, (size_t)(BUF_LEN - 1));
    if (copy_from_user(msg_buffer, buf, bytes)) return -EFAULT;
    msg_buffer[bytes] = '\\0';
    msg_len = bytes;
    printk(KERN_INFO "chardev: received %d bytes\\n", bytes);
    return bytes;
}

static struct file_operations fops = {
    .owner = THIS_MODULE,
    .open = dev_open,
    .release = dev_release,
    .read = dev_read,
    .write = dev_write,
};

static int __init chardev_init(void) {
    major_num = register_chrdev(0, DEVICE_NAME, &fops);
    if (major_num < 0) {
        printk(KERN_ALERT "chardev: failed to register, error %d\\n", major_num);
        return major_num;
    }
    printk(KERN_INFO "chardev: registered with major number %d\\n", major_num);
    printk(KERN_INFO "chardev: create device with: mknod /dev/%s c %d 0\\n", DEVICE_NAME, major_num);
    snprintf(msg_buffer, BUF_LEN, "Hello from chardev_module!\\n");
    msg_len = strlen(msg_buffer);
    return 0;
}

static void __exit chardev_exit(void) {
    unregister_chrdev(major_num, DEVICE_NAME);
    printk(KERN_INFO "chardev: unregistered major %d\\n", major_num);
}

module_init(chardev_init);
module_exit(chardev_exit);`,
  },
  procfs: {
    label: 'Proc Entry',
    modName: 'proc_module',
    desc: 'Create /proc/proc_module read/write entry',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/proc_fs.h>
#include <linux/uaccess.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Proc Filesystem Entry Module");
MODULE_VERSION("1.0");

#define PROC_NAME "proc_module"
#define BUF_SIZE 512

static struct proc_dir_entry *proc_entry;
static char proc_buffer[BUF_SIZE];
static int proc_len = 0;

static ssize_t proc_read(struct file *file, char __user *buf, size_t count, loff_t *pos) {
    if (*pos > 0 || proc_len == 0) return 0;
    if (copy_to_user(buf, proc_buffer, proc_len)) return -EFAULT;
    *pos = proc_len;
    printk(KERN_INFO "proc_module: read %d bytes\\n", proc_len);
    return proc_len;
}

static ssize_t proc_write(struct file *file, const char __user *buf, size_t count, loff_t *pos) {
    int len = min(count, (size_t)(BUF_SIZE - 1));
    if (copy_from_user(proc_buffer, buf, len)) return -EFAULT;
    proc_buffer[len] = '\\0';
    proc_len = len;
    printk(KERN_INFO "proc_module: wrote %d bytes\\n", len);
    return len;
}

static const struct proc_ops proc_fops = {
    .proc_read = proc_read,
    .proc_write = proc_write,
};

static int __init proc_mod_init(void) {
    proc_entry = proc_create(PROC_NAME, 0666, NULL, &proc_fops);
    if (!proc_entry) {
        printk(KERN_ALERT "proc_module: failed to create /proc/%s\\n", PROC_NAME);
        return -ENOMEM;
    }
    snprintf(proc_buffer, BUF_SIZE, "Hello from /proc/%s!\\nWrite to me and read back.\\n", PROC_NAME);
    proc_len = strlen(proc_buffer);
    printk(KERN_INFO "proc_module: /proc/%s created\\n", PROC_NAME);
    return 0;
}

static void __exit proc_mod_exit(void) {
    proc_remove(proc_entry);
    printk(KERN_INFO "proc_module: /proc/%s removed\\n", PROC_NAME);
}

module_init(proc_mod_init);
module_exit(proc_mod_exit);`,
  },
  proc_list: {
    label: 'Process List',
    modName: 'proc_list_module',
    desc: 'Iterate all processes in kernel space',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/sched.h>
#include <linux/sched/signal.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("List all running processes from kernel");

static int __init plist_init(void) {
    struct task_struct *task;
    printk(KERN_INFO "plist: Listing all processes:\\n");
    for_each_process(task) {
        printk(KERN_INFO "plist: [%d] %s\\n", task->pid, task->comm);
    }
    return 0;
}

static void __exit plist_exit(void) {
    printk(KERN_INFO "plist: unloaded\\n");
}

module_init(plist_init);
module_exit(plist_exit);`,
  },
  sysfs: {
    label: 'Sysfs Entry',
    modName: 'sysfs_module',
    desc: 'Create /sys/kernel/sysfs_module/status',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/kobject.h>
#include <linux/sysfs.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Sysfs kobject with read/write attribute");

static struct kobject *kobj;
static int status_val = 100;

static ssize_t status_show(struct kobject *kobj, struct kobj_attribute *attr, char *buf) {
    return sprintf(buf, "%d\\n", status_val);
}

static ssize_t status_store(struct kobject *kobj, struct kobj_attribute *attr, const char *buf, size_t count) {
    sscanf(buf, "%du", &status_val);
    return count;
}

static struct kobj_attribute status_attr = __ATTR(status, 0660, status_show, status_store);

static int __init sysfs_init(void) {
    int error = 0;
    kobj = kobject_create_and_add("sysfs_module", kernel_kobj);
    if (!kobj) return -ENOMEM;
    error = sysfs_create_file(kobj, &status_attr.attr);
    if (error) kobject_put(kobj);
    printk(KERN_INFO "sysfs_module: /sys/kernel/sysfs_module/status created\\n");
    return error;
}

static void __exit sysfs_exit(void) {
    kobject_put(kobj);
    printk(KERN_INFO "sysfs_module: removed\\n");
}

module_init(sysfs_init);
module_exit(sysfs_exit);`,
  },
  timer: {
    label: 'Kernel Timer',
    modName: 'timer_module',
    desc: 'Periodic timer callback every 5s',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/timer.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Kernel timer with periodic callback");

static struct timer_list my_timer;
static int tick_count = 0;

void timer_callback(struct timer_list *t) {
    tick_count++;
    printk(KERN_INFO "timer_module: tick #%d\\n", tick_count);
    mod_timer(&my_timer, jiffies + msecs_to_jiffies(5000));
}

static int __init t_init(void) {
    timer_setup(&my_timer, timer_callback, 0);
    mod_timer(&my_timer, jiffies + msecs_to_jiffies(5000));
    printk(KERN_INFO "timer_module: started (5s interval)\\n");
    return 0;
}

static void __exit t_exit(void) {
    del_timer(&my_timer);
    printk(KERN_INFO "timer_module: stopped after %d ticks\\n", tick_count);
}

module_init(t_init);
module_exit(t_exit);`,
  },
}

const logColor = (level) => {
  if (level === 'error') return 'var(--red)'
  if (level === 'warn') return 'var(--yellow)'
  if (level === 'success') return 'var(--green)'
  return 'var(--text2)'
}

export default function KernelBuilder() {
  const { socket, on, off, emit } = useSocketStore()

  const [code, setCode] = useState(BUILTIN.hello.code)
  const [modName, setModName] = useState(BUILTIN.hello.modName)
  const [autoLoad, setAutoLoad] = useState(false)
  const [activeKey, setActiveKey] = useState('hello')

  const [serverSamples, setServerSamples] = useState([])
  const [showSamples, setShowSamples] = useState(false)

  const [building, setBuilding] = useState(false)
  const [buildLogs, setBuildLogs] = useState([])
  const [buildResult, setBuildResult] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [moduleLoaded, setModuleLoaded] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)

  // Device/Proc info after load
  const [deviceInfo, setDeviceInfo] = useState(null) // { charDevices, blockDevices, procEntry, moduleDevices }

  const [dmesgLines, setDmesgLines] = useState([])
  const [watchingDmesg, setWatchingDmesg] = useState(false)

  const logsEndRef = useRef(null)
  const dmesgEndRef = useRef(null)

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [buildLogs])
  useEffect(() => { dmesgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [dmesgLines])

  useEffect(() => {
    api.get('/kernel/samples')
      .then(r => setServerSamples(r.data.samples || []))
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!socket) return
    const onLog = (d) => setBuildLogs(prev => [...prev, { line: d.line, level: d.level }])
    const onDone = (d) => { setBuilding(false); setBuildResult(d) }
    const onDmesg = (d) => setDmesgLines(prev => [...prev.slice(-199), d.line])

    on('kernel:compile:log', onLog)
    on('kernel:compile:done', onDone)
    on('kernel:dmesg:line', onDmesg)

    return () => {
      off('kernel:compile:log')
      off('kernel:compile:done')
      off('kernel:dmesg:line')
    }
  }, [socket])

  const loadServerSample = async (name) => {
    try {
      const r = await api.get(`/kernel/sample/${name}`)
      setCode(r.data.code)
      setModName(name)
      setActiveKey(null)
      setBuildLogs([])
      setBuildResult(null)
      setDeviceInfo(null)
      setShowSamples(false)
    } catch { /* silent */ }
  }

  const applyBuiltin = (key) => {
    const t = BUILTIN[key]
    setActiveKey(key)
    setModName(t.modName)
    setCode(t.code)
    setBuildLogs([])
    setBuildResult(null)
    setDeviceInfo(null)
  }

  const compile = () => {
    if (!code.trim() || !modName.trim() || building) return
    const sid = Date.now().toString()
    setSessionId(sid)
    setBuildLogs([])
    setBuildResult(null)
    setDeviceInfo(null)
    setBuilding(true)
    emit('kernel:compile', { code, moduleName: modName, autoLoad, sessionId: sid })
  }

  // Fetch device/proc info for the loaded module
  const fetchDeviceInfo = async (name) => {
    try {
      const [devicesR, procR, moduleDevR] = await Promise.all([
        api.get('/kernel/proc-devices'),
        api.get(`/kernel/proc-entry/${name}`),
        api.get(`/kernel/module-devices/${name}`),
      ])
      setDeviceInfo({
        charDevices: devicesR.data.charDevices || [],
        blockDevices: devicesR.data.blockDevices || [],
        procEntry: procR.data,
        moduleDevices: moduleDevR.data,
      })
    } catch { /* silent */ }
  }

  const loadModule = async () => {
    if (!buildResult?.koFile) return
    setLoadingAction(true)
    try {
      await api.post('/kernel/insmod', { module: buildResult.koFile })
      setModuleLoaded(true)
      setBuildResult(r => ({ ...r, loaded: true }))
      setBuildLogs(prev => [...prev, { line: `[ok] Module loaded into kernel`, level: 'success' }])
      // Fetch device info after loading
      setTimeout(() => fetchDeviceInfo(modName), 500)
    } catch (e) {
      const errMsg = e.response?.data?.error || 'insmod failed'
      if (errMsg.toLowerCase().includes('file exists') || errMsg.toLowerCase().includes('exists')) {
        setModuleLoaded(true)
        setBuildResult(r => ({ ...r, loaded: true }))
        setBuildLogs(prev => [...prev, { line: `[warn] Module already loaded in kernel`, level: 'warn' }])
        fetchDeviceInfo(modName)
      } else {
        setBuildLogs(prev => [...prev, { line: `[error] ${errMsg}`, level: 'error' }])
      }
    } finally { setLoadingAction(false) }
  }

  const unloadModule = async () => {
    setLoadingAction(true)
    try {
      await api.post('/kernel/rmmod', { module: modName })
      setModuleLoaded(false)
      setBuildResult(r => r ? ({ ...r, loaded: false }) : r)
      setBuildLogs(prev => [...prev, { line: `[ok] Module "${modName}" unloaded`, level: 'success' }])
      setDeviceInfo(null)
    } catch (e) {
      const errMsg = e.response?.data?.error || 'rmmod failed'
      if (errMsg.toLowerCase().includes('not currently loaded') || errMsg.toLowerCase().includes('no such')) {
        setModuleLoaded(false)
        setBuildResult(r => r ? ({ ...r, loaded: false }) : r)
        setBuildLogs(prev => [...prev, { line: `[warn] Module was not loaded`, level: 'warn' }])
        setDeviceInfo(null)
      } else {
        setBuildLogs(prev => [...prev, { line: `[error] ${errMsg}`, level: 'error' }])
      }
    } finally { setLoadingAction(false) }
  }

  const toggleDmesg = () => {
    if (watchingDmesg) { emit('kernel:dmesg:stop'); setWatchingDmesg(false) }
    else { setDmesgLines([]); emit('kernel:dmesg:watch'); setWatchingDmesg(true) }
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${modName}.c`; a.click()
    URL.revokeObjectURL(url)
  }

  // Find our module in /proc/devices
  const ourDevice = useMemo(() => {
    if (!deviceInfo) return null
    return deviceInfo.charDevices.find(d => d.name.includes(modName) || d.name.includes(modName.replace('_module', '')))
  }, [deviceInfo, modName])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">

      {/* ── LEFT: Editor ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 min-h-0">

        {/* Template picker */}
        <div className="card p-3">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>
            Module Templates
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
            {Object.entries(BUILTIN).map(([key, t]) => (
              <button key={key} onClick={() => applyBuiltin(key)}
                className="p-2.5 rounded-xl text-left transition-all"
                style={activeKey === key ? {
                  background: 'rgba(34,211,238,0.08)',
                  border: '1px solid rgba(34,211,238,0.25)',
                } : {
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}>
                <p className="text-xs font-semibold" style={{ color: activeKey === key ? 'var(--accent)' : 'var(--text)' }}>
                  {t.label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{t.desc}</p>
              </button>
            ))}
          </div>

          {serverSamples.length > 0 && (
            <div className="relative mt-2">
              <button onClick={() => setShowSamples(v => !v)}
                className="btn-ghost w-full flex items-center gap-2 text-xs justify-center">
                <FolderOpen size={13} /> Load from kernel-samples/
              </button>
              <AnimatePresence>
                {showSamples && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-full left-0 right-0 mt-1 z-20 card p-2 space-y-1">
                    {serverSamples.map(s => (
                      <button key={s.name} onClick={() => loadServerSample(s.name)}
                        className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                        style={{ color: 'var(--text2)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Package size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <div>
                          <p className="text-xs mono" style={{ color: 'var(--accent)' }}>{s.filename}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{s.description}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Module name + options */}
        <div className="card p-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>Name:</label>
            <input value={modName} onChange={e => setModName(e.target.value)}
              className="input py-1.5 text-xs mono flex-1" placeholder="module_name" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <input type="checkbox" checked={autoLoad} onChange={e => setAutoLoad(e.target.checked)}
              className="w-3.5 h-3.5 accent-cyan-400" />
            <span className="text-xs" style={{ color: 'var(--text3)' }}>Auto-load</span>
          </label>
        </div>

        {/* Code editor */}
        <div className="terminal-wrap flex-1 flex flex-col min-h-0" style={{ minHeight: 280 }}>
          <div className="terminal-header flex-shrink-0">
            <span className="terminal-dot bg-red-400/60" />
            <span className="terminal-dot bg-yellow-400/60" />
            <span className="terminal-dot bg-green-400/60" />
            <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>{modName}.c</span>
            <span className="ml-auto text-[10px]" style={{ color: 'var(--text3)' }}>
              {code.split('\n').length} lines
            </span>
          </div>
          <textarea value={code} onChange={e => setCode(e.target.value)}
            className="flex-1 p-4 mono text-xs outline-none resize-none leading-relaxed"
            style={{ background: 'var(--code-bg)', color: 'var(--code-text)', caretColor: 'var(--accent)', minHeight: 240 }}
            spellCheck={false} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={compile} disabled={building || !code.trim()}
            className="btn-primary flex items-center gap-2 flex-1 justify-center">
            {building
              ? <><RefreshCw size={14} className="animate-spin" /> Compiling...</>
              : <><Play size={14} /> Compile{autoLoad ? ' & Load' : ''}</>
            }
          </button>
          <button onClick={downloadCode} className="btn-ghost flex items-center gap-2">
            <Download size={14} /> .c
          </button>
          <button onClick={() => { setCode(''); setBuildLogs([]); setBuildResult(null); setDeviceInfo(null) }}
            className="btn-ghost p-2" style={{ color: 'var(--red)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── RIGHT: Build output + device info + dmesg ──────── */}
      <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">

        {/* Build log panel */}
        <div className="card flex flex-col" style={{ minHeight: 220, maxHeight: 320 }}>
          <div className="terminal-header flex-shrink-0">
            <span className="terminal-dot bg-red-400/60" />
            <span className="terminal-dot bg-yellow-400/60" />
            <span className="terminal-dot bg-green-400/60" />
            <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>build output</span>
            {building && <RefreshCw size={11} className="ml-auto animate-spin" style={{ color: 'var(--accent)' }} />}
            {buildResult && !building && (
              <span className="ml-auto flex items-center gap-1 text-xs"
                style={{ color: buildResult.success ? 'var(--green)' : 'var(--red)' }}>
                {buildResult.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {buildResult.success ? 'OK' : 'FAILED'}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 mono text-xs space-y-px"
            style={{ background: 'var(--code-bg)' }}>
            {buildLogs.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text3)' }}>
                Press Compile to start build
              </p>
            ) : (
              buildLogs.map((l, i) => (
                <div key={i} className="leading-relaxed" style={{ color: logColor(l.level) }}>{l.line}</div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Post-build actions */}
        <AnimatePresence>
          {buildResult && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                {buildResult.success
                  ? <CheckCircle size={15} style={{ color: 'var(--green)' }} />
                  : <AlertCircle size={15} style={{ color: 'var(--red)' }} />
                }
                <span className="text-sm font-semibold"
                  style={{ color: buildResult.success ? 'var(--green)' : 'var(--red)' }}>
                  {buildResult.success
                    ? buildResult.loaded ? `✓ Loaded: ${modName}` : `✓ Built: ${modName}.ko`
                    : `✗ Build failed`
                  }
                </span>
                {buildResult.loaded && (
                  <span className="badge badge-green text-[10px] ml-1">
                    <Zap size={9} className="inline" /> Active
                  </span>
                )}
              </div>

              {buildResult.koFile && (
                <p className="text-xs mono" style={{ color: 'var(--text3)' }}>{buildResult.koFile}</p>
              )}

              {buildResult.success && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={loadModule} disabled={loadingAction}
                    className="btn-primary flex items-center gap-2 text-xs">
                    {loadingAction ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                    insmod
                  </button>
                  <button onClick={unloadModule} disabled={loadingAction}
                    className="btn-danger flex items-center gap-2 text-xs">
                    {loadingAction ? <RefreshCw size={12} className="animate-spin" /> : <Square size={12} />}
                    rmmod
                  </button>
                  <button onClick={() => fetchDeviceInfo(modName)}
                    className="btn-ghost flex items-center gap-2 text-xs">
                    <HardDrive size={12} /> Device Info
                  </button>
                  <button onClick={toggleDmesg}
                    className="btn-ghost flex items-center gap-2 text-xs"
                    style={watchingDmesg ? { color: 'var(--accent)', borderColor: 'rgba(34,211,238,0.3)' } : {}}>
                    <Terminal size={12} /> {watchingDmesg ? 'Stop dmesg' : 'Watch dmesg'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Device / Proc Info Panel */}
        <AnimatePresence>
          {deviceInfo && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={14} style={{ color: 'var(--accent2)' }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
                  Device & Proc Mapping
                </p>
              </div>

              {/* Major ID from /proc/devices */}
              {ourDevice && (
                <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu size={12} style={{ color: 'var(--green)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>Registered Character Device</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--text3)' }}>Major Number</p>
                      <p className="text-lg font-bold mono" style={{ color: 'var(--accent)' }}>{ourDevice.major}</p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--text3)' }}>Device Name</p>
                      <p className="text-sm font-semibold mono" style={{ color: 'var(--text)' }}>{ourDevice.name}</p>
                    </div>
                  </div>
                  <div className="mt-2 code-block text-[11px]">
                    <span style={{ color: 'var(--text3)' }}>Create device: </span>
                    <span style={{ color: 'var(--accent)' }}>sudo mknod /dev/{ourDevice.name} c {ourDevice.major} 0</span>
                  </div>
                </div>
              )}

              {/* /proc entry */}
              {deviceInfo.procEntry?.found && (
                <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={12} style={{ color: 'var(--accent2)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent2)' }}>/proc Entry Found</span>
                  </div>
                  <pre className="text-xs mono mt-1 max-h-20 overflow-auto" style={{ color: 'var(--text2)' }}>
                    {deviceInfo.procEntry.content || '/proc/' + modName}
                  </pre>
                  <div className="mt-2 code-block text-[11px]">
                    <span style={{ color: 'var(--text3)' }}>Read: </span>
                    <span style={{ color: 'var(--accent)' }}>cat /proc/{modName.replace('_module', '')}</span>
                  </div>
                </div>
              )}

              {/* /dev entries */}
              {deviceInfo.moduleDevices?.devices?.length > 0 && (
                <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive size={12} style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>/dev Entries</span>
                  </div>
                  {deviceInfo.moduleDevices.devices.map((d, i) => (
                    <div key={i} className="text-xs mono py-0.5" style={{ color: 'var(--text2)' }}>
                      {d.path} {d.major !== undefined && <span style={{ color: 'var(--accent)' }}>(major:{d.major} minor:{d.minor})</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* If nothing found */}
              {!ourDevice && !deviceInfo.procEntry?.found && (!deviceInfo.moduleDevices?.devices?.length) && (
                <div className="px-3 py-2.5 rounded-xl text-xs" style={{ background: 'var(--surface)', color: 'var(--text3)' }}>
                  <p>No /proc entry, /dev device, or major ID found for "{modName}".</p>
                  <p className="mt-1">This module may only use printk (check dmesg) or /sys entries.</p>
                  <p className="mt-1 mono" style={{ color: 'var(--accent)' }}>
                    Try: cat /sys/kernel/{modName}/status
                  </p>
                </div>
              )}

              {/* All char devices summary */}
              <details className="text-xs">
                <summary className="cursor-pointer py-1" style={{ color: 'var(--text3)' }}>
                  All registered char devices ({deviceInfo.charDevices.length})
                </summary>
                <div className="mt-1 max-h-32 overflow-auto code-block text-[10px]">
                  {deviceInfo.charDevices.map((d, i) => (
                    <div key={i} style={{ color: d.name.includes(modName) || d.name.includes(modName.replace('_module', '')) ? 'var(--green)' : 'var(--text3)' }}>
                      {String(d.major).padStart(3)} {d.name}
                    </div>
                  ))}
                </div>
              </details>
            </motion.div>
          )}
        </AnimatePresence>

        {/* dmesg live panel */}
        <AnimatePresence>
          {(watchingDmesg || dmesgLines.length > 0) && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card flex flex-col flex-1" style={{ minHeight: 160, maxHeight: 240 }}>
              <div className="terminal-header flex-shrink-0">
                <span className="terminal-dot bg-red-400/60" />
                <span className="terminal-dot bg-yellow-400/60" />
                <span className="terminal-dot bg-green-400/60" />
                <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>dmesg -w</span>
                {watchingDmesg && (
                  <span className="ml-2 flex items-center gap-1 text-[10px]" style={{ color: 'var(--green)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    live
                  </span>
                )}
                <button onClick={toggleDmesg} className="ml-auto p-1 rounded" style={{ color: 'var(--text3)' }}>
                  {watchingDmesg ? <Square size={11} /> : <X size={11} />}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 mono text-xs space-y-px"
                style={{ background: 'var(--code-bg)' }}>
                {dmesgLines.length === 0 ? (
                  <p style={{ color: 'var(--text3)' }}>Waiting for kernel messages...</p>
                ) : (
                  dmesgLines.map((line, i) => {
                    const color = line.toLowerCase().includes('error') ? 'var(--red)'
                      : line.toLowerCase().includes('warn') ? 'var(--yellow)'
                        : 'var(--green)'
                    return <div key={i} style={{ color }}>{line}</div>
                  })
                )}
                <div ref={dmesgEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Realtime activity log: build / insmod / rmmod commands */}
      <ActivityLog scope="kernel" title="Kernel build & load · live commands" height={200} className="mt-4" />
    </div>
  )
}
