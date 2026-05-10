import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs'
import { Cpu, ScrollText, Hammer } from 'lucide-react'
import ModuleManager from '../components/Kernel/ModuleManager'
import KernelLogs from '../components/Kernel/KernelLogs'
import KernelBuilder from '../components/Kernel/KernelBuilder'

const TABS = [
  { value: 'modules', label: 'Modules',     icon: Cpu },
  { value: 'builder', label: 'Build & Run', icon: Hammer },
  { value: 'logs',    label: 'Kernel Logs', icon: ScrollText },
]

export default function Kernel() {
  const [activeTab, setActiveTab] = useState('builder')

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
          <TabsContent value="builder"><KernelBuilder /></TabsContent>
          <TabsContent value="logs"><KernelLogs /></TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
