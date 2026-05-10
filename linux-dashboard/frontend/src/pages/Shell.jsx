import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs'
import TerminalPanel from '../components/Terminal/TerminalPanel'
import FileManager from '../components/Shell/FileManager'
import PackageManager from '../components/Shell/PackageManager'
import CronManager from '../components/Shell/CronManager'
import SystemTime from '../components/Shell/SystemTime'

export default function Shell() {
  const [activeTab, setActiveTab] = useState('terminal')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Shell & Automation Center</h1>
        <p className="text-cyber-cyan/60">Manage files, packages, cron jobs, and system time</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass border border-cyber-cyan/20">
          <TabsTrigger value="terminal">Terminal</TabsTrigger>
          <TabsTrigger value="files">File Manager</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
          <TabsTrigger value="time">System Time</TabsTrigger>
        </TabsList>

        <TabsContent value="terminal" className="mt-6">
          <TerminalPanel />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FileManager />
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          <PackageManager />
        </TabsContent>

        <TabsContent value="cron" className="mt-6">
          <CronManager />
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          <SystemTime />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
