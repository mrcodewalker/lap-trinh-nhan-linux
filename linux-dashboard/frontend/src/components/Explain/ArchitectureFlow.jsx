/**
 * <ArchitectureFlow scenario="syscall" />
 *
 * Hiển thị sơ đồ userspace → syscall → kernel → driver cho 1 vài luồng.
 */
import React from 'react'
import { Cpu, Terminal as TermIcon, ChevronDown, HardDrive, Network } from 'lucide-react'

const FLOWS = {
  syscall: {
    title: 'System Call (open/read/write)',
    nodes: [
      { layer: 'userspace', icon: TermIcon, label: 'app: read(fd, buf, n)',         tone: '#22d3ee' },
      { layer: 'libc',      icon: TermIcon, label: 'glibc: SYSCALL_CANCEL(read,…)', tone: '#22d3ee' },
      { layer: 'syscall',   icon: Cpu,      label: 'CPU: int 0x80 / syscall instruction', tone: '#a78bfa' },
      { layer: 'kernel',    icon: Cpu,      label: 'kernel: sys_read() → vfs_read()',     tone: '#a78bfa' },
      { layer: 'driver',    icon: HardDrive,label: 'driver: file->f_op->read()',          tone: '#f472b6' },
      { layer: 'hw',        icon: HardDrive,label: 'block layer / device',                tone: '#f472b6' },
    ],
  },
  module: {
    title: 'Insert Kernel Module (insmod)',
    nodes: [
      { layer: 'userspace', icon: TermIcon, label: 'sudo insmod hello.ko',          tone: '#22d3ee' },
      { layer: 'syscall',   icon: Cpu,      label: 'syscall init_module(elf, len)', tone: '#a78bfa' },
      { layer: 'kernel',    icon: Cpu,      label: 'kernel: load_module() → resolve symbols', tone: '#a78bfa' },
      { layer: 'kernel',    icon: Cpu,      label: 'kernel: gọi module_init() handler',      tone: '#a78bfa' },
      { layer: 'kernel',    icon: TermIcon, label: 'printk → __log_buf (ring buffer)',        tone: '#f472b6' },
      { layer: 'userspace', icon: TermIcon, label: 'dmesg đọc /dev/kmsg → output',           tone: '#22d3ee' },
    ],
  },
  socket: {
    title: 'TCP Connection (server side)',
    nodes: [
      { layer: 'userspace', icon: TermIcon, label: 'socket(AF_INET, SOCK_STREAM, 0)',  tone: '#22d3ee' },
      { layer: 'kernel',    icon: Cpu,      label: 'kernel: alloc struct socket + fd', tone: '#a78bfa' },
      { layer: 'userspace', icon: TermIcon, label: 'bind(); listen(backlog)',          tone: '#22d3ee' },
      { layer: 'kernel',    icon: Network,  label: 'kernel: tcp_v4_listen() → SYN queue', tone: '#a78bfa' },
      { layer: 'kernel',    icon: Network,  label: 'three-way handshake (SYN/SYN-ACK/ACK)', tone: '#f472b6' },
      { layer: 'userspace', icon: TermIcon, label: 'accept() → fd mới (client socket)', tone: '#22d3ee' },
    ],
  },
  procfs: {
    title: 'Read /proc/dashboard',
    nodes: [
      { layer: 'userspace', icon: TermIcon, label: 'cat /proc/dashboard',           tone: '#22d3ee' },
      { layer: 'syscall',   icon: Cpu,      label: 'open() / read()',               tone: '#a78bfa' },
      { layer: 'kernel',    icon: Cpu,      label: 'VFS dispatch tới procfs',       tone: '#a78bfa' },
      { layer: 'kernel',    icon: Cpu,      label: 'proc_ops.proc_read = seq_read', tone: '#a78bfa' },
      { layer: 'driver',    icon: HardDrive,label: 'gọi show() callback của module',tone: '#f472b6' },
      { layer: 'userspace', icon: TermIcon, label: 'copy_to_user → buffer của cat', tone: '#22d3ee' },
    ],
  },
}

export default function ArchitectureFlow({ scenario = 'syscall' }) {
  const flow = FLOWS[scenario] || FLOWS.syscall

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Architecture · {flow.title}
        </h3>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text3)' }}>
          flow
        </span>
      </div>

      <div className="space-y-1">
        {flow.nodes.map((n, i) => (
          <React.Fragment key={i}>
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${n.tone}33`,
                boxShadow: `0 0 0 1px ${n.tone}11`,
              }}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: `${n.tone}22`, border: `1px solid ${n.tone}55` }}
              >
                <n.icon size={13} style={{ color: n.tone }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest" style={{ color: n.tone }}>
                  {n.layer}
                </div>
                <div className="text-xs mono" style={{ color: 'var(--text)' }}>{n.label}</div>
              </div>
            </div>
            {i < flow.nodes.length - 1 && (
              <div className="flex justify-center" style={{ color: 'var(--text3)' }}>
                <ChevronDown size={12} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
