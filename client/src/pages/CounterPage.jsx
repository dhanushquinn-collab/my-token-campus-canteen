import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { socket } from '../lib/socket.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { rupees, clock, STAGE_LABELS } from '../lib/format.js'

const NEXT = { placed: 'accepted', accepted: 'cooking', cooking: 'ready', ready: 'collected' }
const NEXT_LABEL = { placed: 'Accept', accepted: 'Start cooking', cooking: 'Mark ready', ready: 'Mark collected' }

export default function CounterPage() {
  const { user, ready } = useAuth()
  const { push } = useToast()
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [menu, setMenu] = useState([])
  const [tab, setTab] = useState('queue')

  useEffect(() => {
    if (user?.role !== 'staff') return
    api('/orders?scope=live').then(setOrders).catch(() => {})
    api('/stats/today').then(setStats).catch(() => {})
    api('/menu', { auth: false }).then(setMenu).catch(() => {})

    const onNew = order => {
      setOrders(o => [...o, order])
      push('New order, token ' + order.token)
    }
    const onUpdate = order => {
      setOrders(o => {
        const rest = o.filter(x => x._id !== order._id)
        return ['collected', 'cancelled'].includes(order.status) ? rest : [...rest, order].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      })
    }
    socket.on('order:new', onNew)
    socket.on('order:updated', onUpdate)
    return () => {
      socket.off('order:new', onNew)
      socket.off('order:updated', onUpdate)
    }
  }, [user, push])

  if (!ready) return null
  if (!user) return <Navigate to="/signin?next=/counter" replace />
  if (user.role !== 'staff') return <Navigate to="/" replace />

  async function advance(order) {
    const status = NEXT[order.status]
    if (!status) return
    try {
      await api('/orders/' + order._id + '/status', { method: 'PATCH', body: { status } })
      api('/stats/today').then(setStats).catch(() => {})
    } catch (e) {
      push(e.message, 'bad')
    }
  }

  async function toggleStock(item) {
    const updated = await api('/menu/' + item.id, { method: 'PATCH', body: { available: !item.available } })
    setMenu(m => m.map(x => (x.id === item.id ? updated : x)))
    push(updated.name + (updated.available ? ' is back on' : ' marked sold out'))
  }

  const maxHour = Math.max(1, ...(stats?.hours || []).map(h => h.orders))

  return (
    <div className="shell">
      <div className="page-art">
        <img src="/img/scene/pass.webp" alt="" />
        <div className="page-art-copy">
          <h1>Counter</h1>
          <p>Orders land here the moment a student places one. Students see every change instantly.</p>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 18 }}>
        <button className="chip" data-on={String(tab === 'queue')} onClick={() => setTab('queue')}>Queue ({orders.length})</button>
        <button className="chip" data-on={String(tab === 'stock')} onClick={() => setTab('stock')}>Stock</button>
        <button className="chip" data-on={String(tab === 'day')} onClick={() => setTab('day')}>Today</button>
      </div>

      {tab === 'queue' && (
        orders.length === 0 ? (
          <div className="empty">
            <img className="empty-art" src="/img/scene/empty-tray.webp" alt="" />
            Queue is clear. New orders appear here on their own.
          </div>
        ) : (
          <div className="queue">
            <AnimatePresence>
              {orders.map(o => (
                <motion.div
                  key={o._id}
                  className="ticket"
                  data-status={o.status}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <div className="ticket-head">
                    <span className="tk mono">{o.token}</span>
                    <span>{STAGE_LABELS[o.status]}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 'var(--step--1)', color: 'var(--steel)' }}>
                      for {clock(o.pickupAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--step--1)' }}>
                    {o.items.map(i => (
                      <div key={i.menuItem} className="row" style={{ justifyContent: 'space-between' }}>
                        <span><span className="mono">{i.qty}</span> {i.name}</span>
                        <span className="diet" data-veg={String(i.veg)} />
                      </div>
                    ))}
                  </div>
                  {o.note && <div style={{ color: 'var(--turmeric)', fontSize: 'var(--step--1)' }}>Note: {o.note}</div>}
                  <div className="row">
                    <span style={{ fontSize: 'var(--step--1)', color: 'var(--steel)' }}>
                      {o.user?.name} · {o.payment === 'upi' ? 'UPI' : 'cash'} · {rupees(o.total)}
                    </span>
                    <button className="btn btn-hot" style={{ marginLeft: 'auto' }} onClick={() => advance(o)}>
                      {NEXT_LABEL[o.status]}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      )}

      {tab === 'stock' && (
        <div className="queue">
          {menu.map(m => (
            <div className="ticket" key={m.id} data-status={m.available ? 'ok' : 'cancelled'}>
              <div className="ticket-head">
                <strong>{m.name}</strong>
                <span style={{ marginLeft: 'auto' }} className="mono">{rupees(m.price)}</span>
              </div>
              <div className="row">
                <span style={{ fontSize: 'var(--step--1)', color: 'var(--steel)' }}>
                  {m.soldToday} sold today{m.dailyLimit ? ' of ' + m.dailyLimit : ''}
                </span>
                <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => toggleStock(m)}>
                  {m.available ? 'Mark sold out' : 'Put back on'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'day' && stats && (
        <>
          <div className="stat-row">
            <div className="stat"><b>{stats.orders}</b><span>orders today</span></div>
            <div className="stat"><b>{stats.collected}</b><span>collected</span></div>
            <div className="stat"><b>{rupees(stats.revenue)}</b><span>taken</span></div>
            <div className="stat"><b>{stats.cancelled}</b><span>cancelled</span></div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 'var(--step-2)' }}>Moving fastest</h2>
            <div className="bars">
              {stats.top.length === 0 && <p style={{ color: 'var(--steel)' }}>Nothing sold yet today.</p>}
              {stats.top.map(t => (
                <div className="bar-row" key={t.name}>
                  <span>{t.name}</span>
                  <span className="bar"><i style={{ width: (t.qty / stats.top[0].qty) * 100 + '%' }} /></span>
                  <span className="mono">{t.qty}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 'var(--step-2)' }}>When they order</h2>
            <div className="bars">
              {stats.hours.map(h => (
                <div className="bar-row" key={h.hour}>
                  <span className="mono">{h.hour}:00</span>
                  <span className="bar"><i style={{ width: (h.orders / maxHour) * 100 + '%' }} /></span>
                  <span className="mono">{h.orders}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn"
            style={{ marginTop: 16 }}
            onClick={async () => {
              await api('/stats/reset-day', { method: 'POST' })
              api('/menu', { auth: false }).then(setMenu)
              push('Counts reset, everything back on the menu.')
            }}
          >
            Reset counts for a new day
          </button>
        </>
      )}
    </div>
  )
}
