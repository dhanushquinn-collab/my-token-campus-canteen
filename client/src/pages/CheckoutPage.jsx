import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useCart } from '../state/CartContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { rupees, clock, slotOptions } from '../lib/format.js'
import Glyph from '../lib/glyphs.jsx'

export default function CheckoutPage() {
  const { items, setQty, subtotal, prepMinutes, clear } = useCart()
  const { user } = useAuth()
  const { push } = useToast()
  const nav = useNavigate()

  const [code, setCode] = useState('')
  const [applied, setApplied] = useState(null)
  const [offers, setOffers] = useState([])
  const [note, setNote] = useState('')
  const [payment, setPayment] = useState('counter')
  const [busy, setBusy] = useState(false)
  const [queue, setQueue] = useState({ extraMinutes: 0, live: 0 })

  const slots = useMemo(() => slotOptions(8, 10), [])
  const [slot, setSlot] = useState(() => slotOptions(8, 10)[0].toISOString())

  useEffect(() => {
    api('/coupons', { auth: false }).then(setOffers).catch(() => {})
    api('/orders/meta/queue', { auth: false }).then(setQueue).catch(() => {})
  }, [])

  const discount = applied?.discount || 0
  const total = subtotal - discount

  async function applyCode(value) {
    const c = (value ?? code).trim().toUpperCase()
    if (!c) return
    try {
      const d = await api('/coupons/check', { method: 'POST', body: { code: c, subtotal }, auth: false })
      setApplied(d)
      setCode(c)
      push(rupees(d.discount) + ' off with ' + d.code)
    } catch (err) {
      setApplied(null)
      push(err.message, 'bad')
    }
  }

  async function placeOrder() {
    if (!user) return nav('/signin?next=/checkout')
    setBusy(true)
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: {
          items: items.map(i => ({ menuItem: i.id, qty: i.qty })),
          pickupAt: slot,
          note,
          payment,
          couponCode: applied?.code || ''
        }
      })
      clear()
      push('Token ' + order.token + ' is with the counter')
      nav('/track/' + order._id)
    } catch (err) {
      push(err.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="shell">
        <div className="page-head"><h1>Your tray is empty</h1></div>
        <div className="empty">
          <img className="empty-art" src="/img/scene/empty-tray.webp" alt="" />
          Nothing here yet. <button className="btn" onClick={() => nav('/')}>Go pick something</button>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <div className="page-head">
        <h1>Your tray</h1>
        <p>Kitchen needs about {prepMinutes + queue.extraMinutes} minutes right now.</p>
      </div>

      <div className="split">
        <div className="panel">
          <div className="tray-list">
            {items.map(i => (
              <div className="tray-row" key={i.id}>
                <Glyph name={i.glyph} style={{ width: 34, height: 34, color: 'var(--steel)' }} />
                <span className="name">
                  {i.name}
                  <br />
                  <small style={{ color: 'var(--steel)' }}>{rupees(i.price)} each</small>
                </span>
                <div className="stepper">
                  <button onClick={() => setQty(i.id, i.qty - 1)} aria-label={'One less ' + i.name}>{'\u2212'}</button>
                  <span>{i.qty}</span>
                  <button onClick={() => setQty(i.id, i.qty + 1)} aria-label={'One more ' + i.name}>+</button>
                </div>
                <span className="price" style={{ minWidth: 64, textAlign: 'right' }}>{rupees(i.price * i.qty)}</span>
              </div>
            ))}
          </div>

          <div className="field" style={{ marginTop: 20 }}>
            <label htmlFor="note">Anything the kitchen should know</label>
            <textarea id="note" rows="2" value={note} onChange={e => setNote(e.target.value)} placeholder="Less spicy, extra chutney…" />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div className="panel">
            <div className="field">
              <label htmlFor="slot">Collect at</label>
              <select id="slot" value={slot} onChange={e => setSlot(e.target.value)}>
                {slots.map(d => (
                  <option key={d.toISOString()} value={d.toISOString()}>{clock(d)}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="code">Offer code</label>
              <div className="row">
                <input id="code" value={code} onChange={e => setCode(e.target.value)} style={{ flex: 1, background: 'var(--ink)', border: '1px solid var(--edge-strong)', padding: 12, borderRadius: 2 }} />
                <button className="btn" onClick={() => applyCode()}>Apply</button>
              </div>
              <div className="chips" style={{ marginTop: 8 }}>
                {offers.map(o => (
                  <button key={o.code} className="chip" onClick={() => applyCode(o.code)} title={o.note}>{o.code}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Payment</label>
              <div className="row">
                <button className="chip" data-on={String(payment === 'counter')} onClick={() => setPayment('counter')}>Pay at counter</button>
                <button className="chip" data-on={String(payment === 'upi')} onClick={() => setPayment('upi')}>UPI on collection</button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>Items</span><span className="mono">{rupees(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="row" style={{ justifyContent: 'space-between', color: 'var(--turmeric)' }}>
                <span>{applied.code}</span><span className="mono">-{rupees(discount)}</span>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--edge)' }}>
              <strong>To pay</strong><strong className="mono" style={{ fontSize: 'var(--step-2)' }}>{rupees(total)}</strong>
            </div>
            <button className="btn btn-hot btn-wide" style={{ marginTop: 16 }} onClick={placeOrder} disabled={busy}>
              {busy ? 'Sending to the counter…' : user ? 'Place order' : 'Sign in to order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
