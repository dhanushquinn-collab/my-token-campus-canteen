import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api.js'
import { socket } from '../lib/socket.js'
import StageStrip from '../components/StageStrip.jsx'
import Stars from '../components/Stars.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { rupees, clock, minutesUntil } from '../lib/format.js'

export default function TrackPage() {
  const { id } = useParams()
  const { push } = useToast()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState('')
  const [ratings, setRatings] = useState({})

  useEffect(() => {
    api('/orders/' + id).then(setOrder).catch(e => setErr(e.message))
  }, [id])

  useEffect(() => {
    const onStatus = payload => {
      if (payload.id !== id) return
      setOrder(o => (o ? { ...o, status: payload.status, history: [...o.history, { status: payload.status, at: payload.at }] } : o))
      if (payload.status === 'ready') push('Token ' + payload.token + ' is ready. Walk over.')
      if (payload.status === 'cooking') push('Your order is on the stove.')
    }
    socket.on('order:status', onStatus)
    return () => socket.off('order:status', onStatus)
  }, [id, push])

  if (err) return <div className="shell"><div className="empty">{err} <Link to="/orders">Your orders</Link></div></div>
  if (!order) return <div className="shell"><div className="skeleton" style={{ marginTop: 30 }} /></div>

  const canCancel = ['placed', 'accepted'].includes(order.status)
  const waiting = minutesUntil(order.pickupAt)

  async function cancel() {
    try {
      const d = await api('/orders/' + id + '/cancel', { method: 'PATCH' })
      setOrder(d)
      push('Order cancelled.')
    } catch (e) {
      push(e.message, 'bad')
    }
  }

  async function collect() {
    try {
      const d = await api('/orders/' + id + '/collected', { method: 'PATCH' })
      setOrder(d)
      push('Collected. Rate it below when you have eaten.')
    } catch (e) {
      push(e.message, 'bad')
    }
  }

  async function submitRatings() {
    const payload = Object.entries(ratings).map(([menuItem, stars]) => ({ menuItem, stars }))
    if (!payload.length) return push('Tap some stars first.', 'bad')
    try {
      await api('/reviews', { method: 'POST', body: { orderId: id, ratings: payload } })
      setOrder(o => ({ ...o, rated: true }))
      push('Thanks, that helps the next student.')
    } catch (e) {
      push(e.message, 'bad')
    }
  }

  return (
    <div className="shell">
      <div className="page-head">
        <h1>{order.status === 'ready' ? 'Ready at the counter' : order.status === 'collected' ? 'Collected' : 'Cooking your order'}</h1>
        <p>
          {order.status === 'ready'
            ? 'Show this number at the counter.'
            : order.status === 'collected'
              ? 'Hope it was good.'
              : 'Collection set for ' + clock(order.pickupAt) + ', about ' + waiting + ' minutes away.'}
        </p>
      </div>

      <div className="split">
        <motion.div className="token" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <span className="token-label">Token number</span>
          <div className="token-num">{order.token}</div>
          <StageStrip status={order.status} history={order.history} />
        </motion.div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div className="panel">
            {order.items.map(i => (
              <div className="row" key={i.menuItem} style={{ justifyContent: 'space-between', padding: '5px 0' }}>
                <span><span className="mono">{i.qty}×</span> {i.name}</span>
                <span className="mono">{rupees(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--edge)' }}>
              <strong>{order.payment === 'upi' ? 'Pay by UPI on collection' : 'Pay at the counter'}</strong>
              <strong className="mono">{rupees(order.total)}</strong>
            </div>
            {order.note && <p style={{ color: 'var(--tile-dim)' }}>Note for the kitchen: {order.note}</p>}
            {canCancel && <button className="btn btn-wide" style={{ marginTop: 12 }} onClick={cancel}>Cancel this order</button>}
            {order.status === 'ready' && (
              <button className="btn btn-hot btn-wide" style={{ marginTop: 12 }} onClick={collect}>
                I have collected it
              </button>
            )}
          </div>

          {order.status === 'collected' && !order.rated && (
            <div className="panel">
              <h2 style={{ fontSize: 'var(--step-2)' }}>Rate what you ate</h2>
              {order.items.map(i => (
                <div className="row" key={i.menuItem} style={{ justifyContent: 'space-between', marginTop: 10 }}>
                  <span>{i.name}</span>
                  <Stars value={ratings[i.menuItem] || 0} onChange={n => setRatings(r => ({ ...r, [i.menuItem]: n }))} />
                </div>
              ))}
              <button className="btn btn-hot btn-wide" style={{ marginTop: 14 }} onClick={submitRatings}>Send ratings</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
