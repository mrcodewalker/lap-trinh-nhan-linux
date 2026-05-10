import { createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Context to pass value/onChange without polluting DOM props
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
    <div className={`flex gap-1 p-1 rounded-xl bg-black/30 border border-white/5 flex-wrap ${className}`}>
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
      className={[
        'relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none',
        isActive
          ? 'text-black bg-gradient-to-r from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/25'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5',
        className,
      ].join(' ')}
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
