import { createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TabsCtx = createContext({ value: '', onChange: () => {} })

export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <TabsCtx.Provider value={{ value, onChange: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  )
}

export function TabsList({ children, className = '' }) {
  return (
    <div
      className={`flex gap-1 p-1 rounded-xl flex-wrap ${className}`}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ children, value, className = '' }) {
  const ctx = useContext(TabsCtx)
  const isActive = value === ctx.value

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => ctx.onChange(value)}
      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none ${className}`}
      style={isActive ? {
        background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
        color: 'var(--tab-active-text)',
        boxShadow: '0 2px 12px rgba(6,182,212,0.25)',
      } : {
        color: 'var(--text3)',
        background: 'transparent',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text2)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text3)' }}
    >
      {children}
    </motion.button>
  )
}

export function TabsContent({ children, value, className = '' }) {
  const ctx = useContext(TabsCtx)
  if (value !== ctx.value) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
