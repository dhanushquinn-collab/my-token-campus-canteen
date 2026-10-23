import { motion } from 'framer-motion'
import { STAGE_LABELS, clock } from '../lib/format.js'

const ORDER = ['placed', 'accepted', 'cooking', 'ready', 'collected']

export default function StageStrip({ status, history = [] }) {
  if (status === 'cancelled') {
    return (
      <div className="stage-strip">
        <div className="stage" data-done="true">
          <span className="stage-mark">×</span>
          <span className="stage-name">Cancelled</span>
          <span className="stage-at mono">{history.length ? clock(history[history.length - 1].at) : ''}</span>
        </div>
      </div>
    )
  }

  const now = ORDER.indexOf(status)

  return (
    <div className="stage-strip">
      {ORDER.map((s, i) => {
        const at = history.find(h => h.status === s)?.at
        return (
          <motion.div
            key={s}
            className="stage"
            data-done={String(i <= now)}
            data-now={String(i === now)}
            initial={false}
            animate={i === now ? { x: [6, 0] } : {}}
            transition={{ duration: 0.28 }}
          >
            <span className="stage-mark">{i <= now ? '✓' : i + 1}</span>
            <span className="stage-name">{STAGE_LABELS[s]}</span>
            <span className="stage-at mono">{at ? clock(at) : ''}</span>
          </motion.div>
        )
      })}
    </div>
  )
}
