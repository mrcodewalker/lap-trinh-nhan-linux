import React, { useState } from 'react'
import { motion } from 'framer-motion'

export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { value, onValueChange })
      )}
    </div>
  )
}

export function TabsList({ children, value, onValueChange, className = '' }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { value, onValueChange })
      )}
    </div>
  )
}

export function TabsTrigger({ children, value: tabValue, value: currentValue, onValueChange, className = '' }) {
  const isActive = tabValue === currentValue

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onValueChange(tabValue)}
      className={`px-4 py-2 rounded-lg font-medium transition-smooth relative ${
        isActive
          ? 'text-cyber-cyan'
          : 'text-cyber-cyan/60 hover:text-cyber-cyan'
      } ${className}`}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyber-cyan to-cyber-purple rounded-full"
        />
      )}
    </motion.button>
  )
}

export function TabsContent({ children, value: tabValue, value: currentValue, className = '' }) {
  if (tabValue !== currentValue) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
