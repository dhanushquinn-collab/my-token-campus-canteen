import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../state/CartContext.jsx'
import { rupees } from '../lib/format.js'

export default function TrayBar() {
  const { count, subtotal, prepMinutes } = useCart()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const hide = pathname === '/checkout' || pathname.startsWith('/track') || pathname === '/counter'

  return (
    <AnimatePresence>
      {count > 0 && !hide && (
        <motion.div
          className="tray-bar"
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          <div>
            <strong>{rupees(subtotal)}</strong>
            <small>{count} item{count > 1 ? 's' : ''} · about {prepMinutes} min to cook</small>
          </div>
          <button className="btn btn-hot" style={{ marginLeft: 'auto' }} onClick={() => nav('/checkout')}>
            Review tray
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
