import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, Download, Play } from 'lucide-react'

export default function ModuleBuilder() {
  const [code, setCode] = useState(`#include <linux/module.h>
#include <linux/kernel.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Sample Kernel Module");

static int __init hello_init(void) {
    printk(KERN_INFO "Hello from kernel module!\\n");
    return 0;
}

static void __exit hello_exit(void) {
    printk(KERN_INFO "Goodbye from kernel module!\\n");
}

module_init(hello_init);
module_exit(hello_exit);
`)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="glass rounded-lg border border-cyber-cyan/20 p-4">
        <h3 className="text-lg font-bold text-cyber-cyan">Kernel Module Builder</h3>
        <p className="text-sm text-cyber-cyan/60 mt-1">Write and compile kernel modules</p>
      </div>

      {/* Editor */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-lg border border-cyber-cyan/20 overflow-hidden"
      >
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-96 p-4 bg-black/50 text-neon-green font-mono text-sm focus:outline-none resize-none"
          placeholder="Write your kernel module code here..."
        />
      </motion.div>

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyber-cyan to-cyber-purple text-black font-semibold transition-smooth flex items-center justify-center gap-2"
        >
          <Play size={16} />
          Compile
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          className="flex-1 py-2 rounded-lg border border-cyber-cyan/30 text-cyber-cyan transition-smooth flex items-center justify-center gap-2"
        >
          <Download size={16} />
          Download
        </motion.button>
      </div>

      {/* Info */}
      <div className="glass rounded-lg border border-cyber-cyan/20 p-4">
        <p className="text-sm text-cyber-cyan/60 mb-2">Module Template</p>
        <p className="text-xs text-cyber-cyan/40">
          This is a basic kernel module template. Modify the code and compile to create your own kernel module.
        </p>
      </div>
    </motion.div>
  )
}
