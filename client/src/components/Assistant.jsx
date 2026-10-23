import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../lib/api.js'
import { useAuth } from '../state/AuthContext.jsx'

const STARTERS = ['Something filling under 80', 'Quickest thing on the counter', 'Spicy and non-veg']

export default function Assistant({ onPicks }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState([
    { me: false, text: 'Tell me your budget, your mood, or how many minutes you have. I will read the live counter and pick.' }
  ])

  if (!user) return null

  async function ask(question) {
    const text = (question ?? q).trim()
    if (!text || busy) return
    setLog(l => [...l, { me: true, text }])
    setQ('')
    setBusy(true)
    try {
      const d = await api('/ai/ask', { method: 'POST', body: { question: text } })
      setLog(l => [...l, { me: false, text: d.reply }])
      if (d.picks?.length) onPicks?.(d.picks)
    } catch (err) {
      setLog(l => [...l, { me: false, text: err.message }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="ai-open" onClick={() => setOpen(o => !o)} aria-label="Ask the counter">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--turmeric)" strokeWidth="1.6">
          <path d="M4 6h16M4 12h10M4 18h13" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ai-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="ai-log">
              {log.map((m, i) => (
                <div key={i} className="ai-msg" data-me={String(m.me)}>{m.text}</div>
              ))}
              {busy && <div className="ai-msg">Reading the counter…</div>}
              {log.length === 1 && (
                <div className="row" style={{ gap: 6 }}>
                  {STARTERS.map(s => (
                    <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="ai-ask">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ask()}
                placeholder="What should I eat?"
              />
              <button className="btn btn-hot" onClick={() => ask()} disabled={busy}>Ask</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
