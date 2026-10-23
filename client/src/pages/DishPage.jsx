import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import Glyph from '../lib/glyphs.jsx'
import { dishPhoto } from '../lib/photo.js'
import Stars from '../components/Stars.jsx'
import { rupees, day } from '../lib/format.js'
import { useCart } from '../state/CartContext.jsx'

export default function DishPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const { add, qtyOf, setQty } = useCart()

  useEffect(() => {
    api('/menu/' + id, { auth: false }).then(setData).catch(e => setErr(e.message))
  }, [id])

  if (err) return <div className="shell"><div className="empty">{err} <Link to="/">Back to the menu</Link></div></div>
  if (!data) return <div className="shell"><div className="skeleton" style={{ marginTop: 30 }} /></div>

  const { item, reviews } = data
  const qty = qtyOf(item.id)

  return (
    <div className="shell">
      <div className="page-head">
        <Link className="btn btn-quiet" to="/" style={{ paddingLeft: 0 }}>Back to the menu</Link>
        <h1 style={{ marginTop: 10 }}>{item.name}</h1>
        <p>{item.description}</p>
      </div>

      <div className="split">
        <div className="panel">
          <div className="dish-art" data-photo="true" style={{ height: 280 }}>
            <img
              src={dishPhoto(item.name)}
              alt={item.name}
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
          <div className="dish-meta" style={{ marginTop: 14 }}>
            <span className="diet" data-veg={String(item.veg)} />
            <span>{item.veg ? 'Vegetarian' : 'Non-vegetarian'}</span>
            <span>{item.prepMinutes} min to cook</span>
            <span>{item.category}</span>
          </div>
          <div className="row" style={{ marginTop: 18 }}>
            <span className="price">{rupees(item.price)}</span>
            {qty === 0 ? (
              <button className="btn btn-hot" disabled={!item.available} onClick={() => add(item)}>
                {item.available ? 'Add to tray' : 'Sold out today'}
              </button>
            ) : (
              <div className="stepper">
                <button onClick={() => setQty(item.id, qty - 1)}>{'\u2212'}</button>
                <span>{qty}</span>
                <button onClick={() => setQty(item.id, qty + 1)}>+</button>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ fontSize: 'var(--step-2)' }}>What students said</h2>
          <div className="row" style={{ marginTop: 8 }}>
            <Stars value={Math.round(item.rating)} />
            <span className="mono">{item.rating || '—'}</span>
            <span style={{ color: 'var(--steel)' }}>{item.ratingCount} rating{item.ratingCount === 1 ? '' : 's'}</span>
          </div>

          {reviews.length === 0 ? (
            <p style={{ color: 'var(--tile-dim)' }}>No ratings yet. Order it and be the first.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              {reviews.map(r => (
                <div key={r._id} style={{ borderTop: '1px dashed var(--edge)', paddingTop: 10 }}>
                  <div className="row">
                    <Stars value={r.stars} size={15} />
                    <strong style={{ fontSize: 'var(--step--1)' }}>{r.user?.name || 'Student'}</strong>
                    <span style={{ marginLeft: 'auto', color: 'var(--steel)', fontSize: 'var(--step--1)' }}>{day(r.createdAt)}</span>
                  </div>
                  {r.text && <p style={{ margin: '6px 0 0', fontSize: 'var(--step--1)' }}>{r.text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
