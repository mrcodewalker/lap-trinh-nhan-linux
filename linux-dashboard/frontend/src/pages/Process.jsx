import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs'
import ProcessManager from '../components/Process/ProcessManager'
import ResourceMonitor from '../components/Process/ResourceMonitor'
import SocketMonitor from '../components/Process/SocketMonitor'
import NetworkTools from '../components/Process/NetworkTools'

export default function Process() {
  const [activeTab, setActiveTab] = useState('processes')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Process & Network Monitor</h1>
        <p className="text-cyber-cyan/60">Real-time system resource and network monitoring</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass border border-cyber-cyan/20">
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="sockets">Sockets</TabsTrigger>
          <TabsTrigger value="network">Network Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="processes" className="mt-6">
          <ProcessManager />
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <ResourceMonitor />
        </TabsContent>

        <TabsContent value="sockets" className="mt-6">
          <SocketMonitor />
        </TabsContent>

        <TabsContent value="network" className="mt-6">
          <NetworkTools />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
