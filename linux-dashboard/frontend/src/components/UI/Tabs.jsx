import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Tabs container - holds state and passes to children via context
export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <div className={className} data-tabs-value={value}>
      {React.Children.map(children, (child) => {
        if (!child) return null
        return React.cloneElement(child, { _tabsValue: value, _onValueChange: onValueChange })
      })}
    </div>
  )
}

// TabsList - renders the tab buttons
export function TabsList({ children, _tabsValue, _onValueChange, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 rounded-xl bg-black/30 border border-white/5 ${className}`}>
      {React.Children.map(children, (child) => {
        if (!child) return null
        return React.cloneElement(child, { _tabsValue, _onValueChange })
      })}
    </div>
  )
}

// TabsTrigger - individual tab button
export function TabsTrigger({ children, value, _tabsValue, _onValueChange, className = '' }) {
  const isActive = value === _tabsValue

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => _onValueChange && _onValueChange(value)}
      className={`
        relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none
        ${isActive
          ? 'text-black bg-gradient-to-r from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/25'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
        }
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
}

// TabsContent - content panel for each tab
export function TabsContent({ children, value, _tabsValue, className = '' }) {
  if (value !== _tabsValue) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
