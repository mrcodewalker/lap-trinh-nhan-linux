/**
 * Activity page — tổng hợp tất cả command thật đã thực thi qua dashboard.
 * Phân theo scope với tab. Mỗi tab dùng <ActivityLog/> riêng — tự subscribe socket.
 */
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs'
import { Activity as ActIcon, FolderOpen, Cpu, Server, Calendar, Package, Clock, Network, PlayCircle, Bug, Terminal as TermIcon } from 'lucide-react'
import ActivityLog from '../components/ActivityLog/ActivityLog'

const TABS = [
  { value: 'all',      label: 'All',      icon: ActIcon,    title: 'All system activity'    },
  { value: 'terminal', label: 'Terminal', icon: TermIcon,   title: 'Terminal commands'      },
  { value: 'files',    label: 'Files',    icon: FolderOpen, title: 'File operations'        },
  { value: 'process',  label: 'Process',  icon: Server,     title: 'Process actions'        },
  { value: 'kernel',   label: 'Kernel',   icon: Cpu,        title: 'Kernel module / build'  },
  { value: 'cron',     label: 'Cron',     icon: Calendar,   title: 'Cron management'        },
  { value: 'packages', label: 'Packages', icon: Package,    title: 'apt install / remove'   },
  { value: 'network',  label: 'Network',  icon: Network,    title: 'Network commands'       },
  { value: 'system',   label: 'System',   icon: Clock,      title: 'System (timedatectl…)'  },
  { value: 'demo',     label: 'Demo',     icon: PlayCircle, title: 'Demo scenarios'         },
  { value: 'strace',   label: 'Strace',   icon: Bug,        title: 'Strace runs'            },
]

export default function Activity() {
  const [tab, setTab] = useState('all')

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="flex flex-col h-full p-5 gap-4 overflow-hidden"
    >
      <div className="flex items-center gap-2">
        <ActIcon size={16} style={{ color: 'var(--accent)' }} />
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Activity Log</h1>
        <span className="text-xs" style={{ color: 'var(--text3)' }}>
          mọi command thật đã chạy trên hệ thống
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0 gap-4">
        <TabsList>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <span className="flex items-center gap-1.5">
                <Icon size={13} /> {label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-h-0 overflow-auto">
          {TABS.map(({ value, title }) => (
            <TabsContent key={value} value={value}>
              <ActivityLog scope={value} title={title} height={'70vh'} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </motion.div>
  )
}
