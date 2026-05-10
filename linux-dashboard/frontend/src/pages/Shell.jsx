import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs'
import { Terminal, FolderOpen, Package, Clock, CalendarClock } from 'lucide-react'
import TerminalPanel from '../components/Terminal/TerminalPanel'
import FileManager from '../components/Shell/FileManager'
import PackageManager from '../components/Shell/PackageManager'
import CronManager from '../components/Shell/CronManager'
import SystemTime from '../components/Shell/SystemTime'

const TABS = [
  { value: 'terminal', label: 'Terminal',     icon: Terminal },
  { value: 'files',    label: 'Files',        icon: FolderOpen },
  { value: 'packages', label: 'Packages',     icon: Package },
  { value: 'cron',     label: 'Cron Jobs',    icon: CalendarClock },
  { value: 'time',     label: 'System Time',  icon: Clock },
]

export default function Shell() {
  const [activeTab, setActiveTab] = useState('terminal')

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full p-5 gap-4 overflow-hidden"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 gap-4">
        {/* Tab bar */}
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

        {/* Content panels */}
        <div className="flex-1 min-h-0 overflow-auto">
          <TabsContent value="terminal" className="h-full">
            <TerminalPanel />
          </TabsContent>
          <TabsContent value="files">
            <FileManager />
          </TabsContent>
          <TabsContent value="packages">
            <PackageManager />
          </TabsContent>
          <TabsContent value="cron">
            <CronManager />
          </TabsContent>
          <TabsContent value="time">
            <SystemTime />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
