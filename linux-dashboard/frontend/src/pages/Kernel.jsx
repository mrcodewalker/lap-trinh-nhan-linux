import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs'
import { Cpu, ScrollText, Hammer } from 'lucide-react'
import ModuleManager from '../components/Kernel/ModuleManager'
import KernelLogs from '../components/Kernel/KernelLogs'
import ModuleBuilder from '../components/Kernel/ModuleBuilder'

const TABS = [
  { value: 'modules',  label: 'Modules',  icon: Cpu },
  { value: 'logs',     label: 'Kernel Logs', icon: ScrollText },
  { value: 'builder',  label: 'Builder',  icon: Hammer },
]

export default function Kernel() {
  const [activeTab, setActiveTab] = useState('modules')

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full p-5 gap-4 overflow-hidden"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 gap-4">
        <TabsList>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <span className="flex items-center gap-1.5">
                <Icon size={13} />
                {label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-h-0 overflow-auto">
          <TabsContent value="modules"><ModuleManager /></TabsContent>
          <TabsContent value="logs"><KernelLogs /></TabsContent>
          <TabsContent value="builder"><ModuleBuilder /></TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
