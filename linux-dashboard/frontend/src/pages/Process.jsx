import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs'
import { Activity, BarChart2, Network, Wifi, ScrollText } from 'lucide-react'
import ProcessManager from '../components/Process/ProcessManager'
import ResourceMonitor from '../components/Process/ResourceMonitor'
import SocketMonitor from '../components/Process/SocketMonitor'
import NetworkTools from '../components/Process/NetworkTools'
import SystemLogs from '../components/Process/SystemLogs'

const TABS = [
  { value: 'processes', label: 'Processes',  icon: Activity },
  { value: 'resources', label: 'Resources',  icon: BarChart2 },
  { value: 'sockets',   label: 'Sockets',    icon: Network },
  { value: 'network',   label: 'Net Tools',  icon: Wifi },
  { value: 'logs',      label: 'Sys Logs',   icon: ScrollText },
]

export default function Process() {
  const [activeTab, setActiveTab] = useState('processes')

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
          <TabsContent value="processes"><ProcessManager /></TabsContent>
          <TabsContent value="resources"><ResourceMonitor /></TabsContent>
          <TabsContent value="sockets"><SocketMonitor /></TabsContent>
          <TabsContent value="network"><NetworkTools /></TabsContent>
          <TabsContent value="logs"><SystemLogs /></TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
