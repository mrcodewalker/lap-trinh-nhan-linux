/**
 * <ExplainPanel concept="chmod" />     - hiển thị một concept theo key.
 * <ExplainPanel inline data={{...}} /> - hiển thị một block inline (custom).
 *
 * Tương ứng yêu cầu "Explain Button / Command Breakdown / Kernel Flow Explanation".
 */
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X, BookOpen, Cpu, AlertTriangle, ChevronRight, Terminal } from 'lucide-react'
import { CONCEPTS, SYSCALLS } from '../../data/linuxConcepts'

function Section({ icon: Icon, title, children, color = 'var(--accent)' }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold" style={{ color }}>
        <Icon size={11} />
        {title}
      </div>
      <div className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>
        {children}
      </div>
    </div>
  )
}

function ConceptBody({ data }) {
  if (!data) return <div className="text-xs" style={{ color: 'var(--text3)' }}>Không có dữ liệu giải thích.</div>

  return (
    <div className="space-y-4">
      <Section icon={BookOpen} title="What it does">
        {data.summary}
      </Section>

      {data.command && (
        <Section icon={Terminal} title="Command" color="var(--green)">
          <code className="block code-block !p-2 !text-[11px]">{data.command}</code>
        </Section>
      )}

      {data.breakdown && data.breakdown.length > 0 && (
        <Section icon={ChevronRight} title="Breakdown">
          <div className="space-y-1">
            {data.breakdown.map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <code className="px-1.5 py-0.5 rounded text-[10.5px] mono" style={{ background: 'var(--surface2)', color: 'var(--accent)' }}>
                  {b.token}
                </code>
                <span className="text-[11.5px]">{b.meaning}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.syscalls && data.syscalls.length > 0 && (
        <Section icon={Cpu} title="Syscalls" color="var(--accent2)">
          <div className="space-y-1.5">
            {data.syscalls.map((s) => (
              <div key={s} className="text-[11.5px]">
                <code className="text-[10.5px] mono" style={{ color: 'var(--accent2)' }}>
                  {SYSCALLS[s]?.signature || s + '(...)'}
                </code>
                {SYSCALLS[s]?.summary && (
                  <div className="mt-0.5" style={{ color: 'var(--text3)' }}>{SYSCALLS[s].summary}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.concepts && data.concepts.length > 0 && (
        <Section icon={BookOpen} title="Related concepts">
          <div className="flex flex-wrap gap-1">
            {data.concepts.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-full text-[10px] mono"
                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border2)' }}>
                {c}
              </span>
            ))}
          </div>
        </Section>
      )}

      {data.flow && data.flow.length > 0 && (
        <Section icon={Cpu} title="Userspace → Kernel flow" color="var(--pink)">
          <pre className="code-block !text-[10.5px] !p-2 leading-relaxed">{data.flow.join('\n')}</pre>
        </Section>
      )}

      {data.verify && (
        <Section icon={Terminal} title="How to verify" color="var(--green)">
          <code className="block code-block !p-2 !text-[11px]">{data.verify}</code>
        </Section>
      )}

      {data.risks && (
        <Section icon={AlertTriangle} title="Risks" color="var(--yellow)">
          {data.risks}
        </Section>
      )}
    </div>
  )
}

/* Variant 1 — inline card */
export function ExplainCard({ concept, data }) {
  const d = data || (concept ? CONCEPTS[concept] : null)
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Info size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {concept ? `Explain: ${concept}` : 'Explanation'}
        </span>
      </div>
      <ConceptBody data={d} />
    </div>
  )
}

/* Variant 2 — modal popover with trigger button */
export default function ExplainPanel({ concept, data, label = 'Explain', size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const d = data || (concept ? CONCEPTS[concept] : null)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost py-1 px-2.5 text-[11px] flex items-center gap-1.5"
        title="View Linux concept"
      >
        <Info size={12} />
        {label}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="modal-backdrop"
              onClick={() => setOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 12, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 8, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="modal-box"
                style={{ maxWidth: size === 'lg' ? 720 : 560, maxHeight: '85vh', overflow: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Info size={16} style={{ color: 'var(--accent)' }} />
                    <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                      {concept ? `Linux concept · ${concept}` : 'Explanation'}
                    </h3>
                  </div>
                  <button onClick={() => setOpen(false)} className="btn-ghost p-1"><X size={14} /></button>
                </div>
                <ConceptBody data={d} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
