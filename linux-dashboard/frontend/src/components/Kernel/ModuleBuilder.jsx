import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Download, RefreshCw, CheckCircle, AlertCircle, X, Zap, Trash2, FolderOpen } from 'lucide-react'
import api from '../../utils/api'

const TEMPLATES = {
  hello: {
    name: 'Hello World', desc: 'Basic init/exit', modName: 'hello_module',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Hello World Kernel Module");
MODULE_VERSION("1.0");

static int __init hello_init(void) {
    printk(KERN_INFO "hello_module: loaded\\n");
    return 0;
}
static void __exit hello_exit(void) {
    printk(KERN_INFO "hello_module: unloaded\\n");
}
module_init(hello_init);
module_exit(hello_exit);`
  },
  proc: {
    name: 'Proc FS', desc: 'Read/write /proc', modName: 'proc_module',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/proc_fs.h>
#include <linux/uaccess.h>
#include <linux/seq_file.h>

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Proc Filesystem Module");

#define PROC_NAME "dashboard"

static int proc_show(struct seq_file *m, void *v) {
    seq_printf(m, "Linux Dashboard Kernel Module\\n");
    seq_printf(m, "Kernel: %s\\n", utsname()->release);
    return 0;
}
static int proc_open(struct inode *inode, struct file *file) {
    return single_open(file, proc_show, NULL);
}
static const struct proc_ops proc_fops = {
    .proc_open    = proc_open,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};
static int __init proc_init(void) {
    proc_create(PROC_NAME, 0444, NULL, &proc_fops);
    printk(KERN_INFO "proc_module: /proc/%s created\\n", PROC_NAME);
    return 0;
}
static void __exit proc_exit(void) {
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "proc_module: removed\\n");
}
module_init(proc_init);
module_exit(proc_exit);`
  },
  timer: {
    name: 'Kernel Timer', desc: 'Periodic callback', modName: 'timer_module',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/timer.h>
#include <linux/jiffies.h>

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Kernel Timer Module");

static struct timer_list my_timer;
static int tick_count = 0;
static unsigned long interval_ms = 5000;

static void timer_callback(struct timer_list *t) {
    tick_count++;
    printk(KERN_INFO "timer_module: tick #%d\\n", tick_count);
    mod_timer(&my_timer, jiffies + msecs_to_jiffies(interval_ms));
}
static int __init timer_init(void) {
    timer_setup(&my_timer, timer_callback, 0);
    mod_timer(&my_timer, jiffies + msecs_to_jiffies(interval_ms));
    printk(KERN_INFO "timer_module: started\\n");
    return 0;
}
static void __exit timer_exit(void) {
    del_timer_sync(&my_timer);
    printk(KERN_INFO "timer_module: stopped after %d ticks\\n", tick_count);
}
module_init(timer_init);
module_exit(timer_exit);`
  },
  chardev: {
    name: 'Char Device', desc: 'Character driver', modName: 'chardev_module',
    code: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/cdev.h>
#include <linux/device.h>

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Character Device Driver");

#define DEVICE_NAME "dashboard_dev"
#define BUF_SIZE    256

static int    major_num;
static char   device_buf[BUF_SIZE];
static int    buf_len = 0;
static struct cdev   my_cdev;
static struct class  *dev_class;

static int dev_open(struct inode *i, struct file *f) { return 0; }
static int dev_release(struct inode *i, struct file *f) { return 0; }

static ssize_t dev_read(struct file *f, char __user *buf, size_t len, loff_t *off) {
    int bytes = min((int)len, buf_len);
    if (copy_to_user(buf, device_buf, bytes)) return -EFAULT;
    return bytes;
}
static ssize_t dev_write(struct file *f, const char __user *buf, size_t len, loff_t *off) {
    buf_len = min((int)len, BUF_SIZE - 1);
    if (copy_from_user(device_buf, buf, buf_len)) return -EFAULT;
    device_buf[buf_len] = '\\0';
    return buf_len;
}
static struct file_operations fops = {
    .open = dev_open, .release = dev_release,
    .read = dev_read, .write   = dev_write,
};
static int __init chardev_init(void) {
    dev_t dev_num;
    alloc_chrdev_region(&dev_num, 0, 1, DEVICE_NAME);
    major_num = MAJOR(dev_num);
    dev_class = class_create(THIS_MODULE, DEVICE_NAME);
    device_create(dev_class, NULL, dev_num, NULL, DEVICE_NAME);
    cdev_init(&my_cdev, &fops);
    cdev_add(&my_cdev, dev_num, 1);
    printk(KERN_INFO "chardev: major=%d\\n", major_num);
    return 0;
}
static void __exit chardev_exit(void) {
    dev_t dev_num = MKDEV(major_num, 0);
    cdev_del(&my_cdev);
    device_destroy(dev_class, dev_num);
    class_destroy(dev_class);
    unregister_chrdev_region(dev_num, 1);
}
module_init(chardev_init);
module_exit(chardev_exit);`
  },
}

export default function ModuleBuilder() {
  const [activeTemplate, setActiveTemplate] = useState('hello')
  const [code, setCode]         = useState(TEMPLATES.hello.code)
  const [modName, setModName]   = useState(TEMPLATES.hello.modName)
  const [autoLoad, setAutoLoad] = useState(false)
  const [building, setBuilding] = useState(false)
  const [result, setResult]     = useState(null)
  const [serverSamples, setServerSamples] = useState([])
  const [showSamples, setShowSamples]     = useState(false)

  useEffect(() => {
    api.get('/kernel/samples')
      .then(r => setServerSamples(r.data.samples || []))
      .catch(() => {})
  }, [])

  const applyTemplate = (key) => {
    const t = TEMPLATES[key]
    setActiveTemplate(key)
    setCode(t.code)
    setModName(t.modName)
    setResult(null)
  }

  const loadServerSample = async (name) => {
    try {
      const r = await api.get(`/kernel/sample/${name}`)
      setCode(r.data.code)
      setModName(name)
      setActiveTemplate(null)
      setResult(null)
      setShowSamples(false)
    } catch { /* silent */ }
  }

  const build = async () => {
    if (!code.trim() || !modName.trim()) return
    setBuilding(true); setResult(null)
    try {
      const r = await api.post('/kernel/compile', { code, moduleName: modName, autoLoad })
      setResult({ success: r.data.success, output: r.data.buildOutput || r.data.message, loaded: r.data.loaded })
    } catch (e) {
      setResult({ success: false, output: e.response?.data?.buildError || e.response?.data?.error || 'Build failed' })
    } finally { setBuilding(false) }
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${modName}.c`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      {/* Template picker */}
      <div className="card p-3">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Templates</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button key={key} onClick={() => applyTemplate(key)}
              className="p-3 rounded-xl text-left transition-all"
              style={activeTemplate === key ? {
                background: 'rgba(34,211,238,0.08)',
                border: '1px solid rgba(34,211,238,0.25)',
                color: 'var(--accent)',
              } : {
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text3)',
              }}>
              <p className="text-xs font-semibold">{t.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Config bar */}
      <div className="card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: 'var(--text3)' }}>Module name:</label>
          <input value={modName} onChange={e => setModName(e.target.value)}
            className="input w-44 py-1.5 text-xs mono" placeholder="module_name" />
        </div>
        {serverSamples.length > 0 && (
          <div className="relative">
            <button onClick={() => setShowSamples(v => !v)}
              className="btn-ghost flex items-center gap-1.5 text-xs">
              <FolderOpen size={13} /> Server Samples
            </button>
            <AnimatePresence>
              {showSamples && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute top-full left-0 mt-1 z-20 card p-2 min-w-[200px] space-y-1">
                  {serverSamples.map(s => (
                    <button key={s.name} onClick={() => loadServerSample(s.name)}
                      className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text2)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <p className="text-xs mono" style={{ color: 'var(--accent)' }}>{s.filename}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{s.description}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input type="checkbox" checked={autoLoad} onChange={e => setAutoLoad(e.target.checked)}
            className="w-3.5 h-3.5 accent-cyan-400" />
          <span className="text-xs" style={{ color: 'var(--text3)' }}>Auto-load after build</span>
        </label>
      </div>

      {/* Editor */}
      <div className="terminal-wrap">
        <div className="terminal-header">
          <span className="terminal-dot bg-red-400/60" />
          <span className="terminal-dot bg-yellow-400/60" />
          <span className="terminal-dot bg-green-400/60" />
          <span className="text-xs ml-2 mono" style={{ color: 'var(--text3)' }}>{modName}.c</span>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--text3)' }}>
            {code.split('\n').length} lines
          </span>
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)}
          className="w-full p-4 mono text-xs outline-none resize-none leading-relaxed"
          style={{ minHeight: '380px', background: 'var(--code-bg)', color: 'var(--code-text)', caretColor: 'var(--accent)' }}
          spellCheck={false} />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={build} disabled={building || !code.trim()}
          className="btn-primary flex items-center gap-2 px-6">
          {building ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          {building ? 'Compiling...' : 'Compile'}
        </button>
        <button onClick={downloadCode} className="btn-ghost flex items-center gap-2">
          <Download size={14} /> Download .c
        </button>
        <button onClick={() => { setCode(''); setResult(null) }}
          className="btn-ghost flex items-center gap-2"
          style={{ color: 'var(--red)' }}>
          <Trash2 size={14} /> Clear
        </button>
      </div>

      {/* Build output */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              {result.success
                ? <CheckCircle size={15} style={{ color: 'var(--green)' }} />
                : <AlertCircle size={15} style={{ color: 'var(--red)' }} />
              }
              <span className="text-sm font-semibold" style={{ color: result.success ? 'var(--green)' : 'var(--red)' }}>
                {result.success ? (result.loaded ? '✓ Built & Loaded!' : '✓ Build Successful!') : '✗ Build Failed'}
              </span>
              {result.loaded && <span className="badge badge-green text-[10px] ml-1"><Zap size={9} className="inline" /> Active</span>}
              <button onClick={() => setResult(null)} className="ml-auto">
                <X size={14} style={{ color: 'var(--text3)' }} />
              </button>
            </div>
            <pre className="code-block text-xs max-h-52 overflow-auto whitespace-pre-wrap">{result.output}</pre>
            {result.success && (
              <p className="text-xs mt-3" style={{ color: 'var(--text3)' }}>
                💡 Check kernel logs: <span className="mono" style={{ color: 'var(--accent)' }}>dmesg | tail</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
