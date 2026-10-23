import { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const Ctx = createContext(null)
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [list, setList] = useState([])

  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setList(l => [...l, { id, text, kind }])
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 3600)
  }, [])

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {list.map(t => (
            <motion.div
              key={t.id}
              className="toast"
              data-kind={t.kind}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
