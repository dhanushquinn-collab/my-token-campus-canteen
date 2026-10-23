import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useCart } from '../state/CartContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { rupees, day, clock, STAGE_LABELS } from '../lib/format.js'

export default function OrdersPage() {
  const [orders, setOrders] = useState(null)
  const { add, clear } = useCart()
  const { push } = useToast()
  const nav = useNavigate()

  useEffect(() => {
    api('/orders/mine').then(setOrders).catch(() => setOrders([]))
  }, [])

  async function reorder(order) {
    const menu = await api('/menu', { auth: false })
    const missing = []
    clear()
    for (const line of order.items) {
      const dish = menu.find(m => m.id === String(line.menuItem))
      if (!dish || !dish.available) { missing.push(line.name); continue }
      for (let n = 0; n < line.qty; n++) add(dish)
    }
    if (missing.length) push(missing.join(' and ') + ' is off the menu today.', 'bad')
    nav('/checkout')
  }

  if (!orders) return <div className="shell"><div className="skeleton" style={{ marginTop: 30 }} /></div>

  return (
    <div className="shell">
      <div className="page-head">
        <h1>Your orders</h1>
        <p>Everything you have collected, cancelled, or are waiting on.</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty">No orders yet. <Link to="/">Start with the menu</Link>.</div>
      ) : (
        <div className="queue">
          {orders.map(o => (
            <div className="ticket" key={o._id} data-status={o.status}>
              <div className="ticket-head">
                <span className="tk mono">{o.token}</span>
                <span>{STAGE_LABELS[o.status]}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--steel)', fontSize: 'var(--step--1)' }}>
                  {day(o.createdAt)} {clock(o.createdAt)}
                </span>
              </div>
              <div style={{ color: 'var(--tile-dim)', fontSize: 'var(--step--1)' }}>
                {o.items.map(i => i.qty + ' ' + i.name).join(', ')}
              </div>
              <div className="row">
                <strong className="mono">{rupees(o.total)}</strong>
                <Link className="btn" to={'/track/' + o._id} style={{ marginLeft: 'auto' }}>Open</Link>
                <button className="btn btn-hot" onClick={() => reorder(o)}>Order again</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
