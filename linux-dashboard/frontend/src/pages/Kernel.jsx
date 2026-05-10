import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs'
import ModuleManager from '../components/Kernel/ModuleManager'
import KernelLogs from '../components/Kernel/KernelLogs'
import ModuleBuilder from '../components/Kernel/ModuleBuilder'

export default function Kernel() {
  const [activeTab, setActiveTab] = useState('modules')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Kernel Module Center</h1>
        <p className="text-cyber-cyan/60">Build, load, and manage Linux kernel modules</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass border border-cyber-cyan/20">
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="logs">Kernel Logs</TabsTrigger>
          <TabsTrigger value="builder">Module Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-6">
          <ModuleManager />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <KernelLogs />
        </TabsContent>

        <TabsContent value="builder" className="mt-6">
          <ModuleBuilder />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
