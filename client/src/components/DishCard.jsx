import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import Glyph from '../lib/glyphs.jsx'
import { dishPhoto } from '../lib/photo.js'
import { rupees } from '../lib/format.js'
import { useCart } from '../state/CartContext.jsx'

export default function DishCard({ dish }) {
  const { qtyOf, add, setQty } = useCart()
  const [noPhoto, setNoPhoto] = useState(false)
  const qty = qtyOf(dish.id)
  const left = dish.dailyLimit ? dish.dailyLimit - dish.soldToday : null
  const out = !dish.available || (left !== null && left <= 0)

  return (
    <motion.article className="dish" data-out={String(out)} layout>
      {out && <span className="sold">Sold out</span>}
      <div className="dish-art" data-photo={String(!noPhoto)}>
        {noPhoto ? (
          <Glyph name={dish.glyph} style={{ color: dish.veg ? 'var(--tile)' : 'var(--turmeric)' }} />
        ) : (
          <img
            src={dishPhoto(dish.name)}
            alt={dish.name}
            loading="lazy"
            decoding="async"
            onError={() => setNoPhoto(true)}
          />
        )}
      </div>

      <div className="dish-body">
        <h3>
          <Link to={'/dish/' + dish.id} style={{ textDecoration: 'none' }}>{dish.name}</Link>
        </h3>
        <p>{dish.description}</p>
        <div className="dish-meta">
          <span className="diet" data-veg={String(dish.veg)} aria-label={dish.veg ? 'Vegetarian' : 'Non-vegetarian'} />
          <span>{dish.prepMinutes} min</span>
          {dish.spice > 0 && <span>{'\u25CF'.repeat(dish.spice)} heat</span>}
          {dish.ratingCount > 0 && <span>{dish.rating} ★</span>}
          {left !== null && left > 0 && left <= 10 && <span className="left-count">{left} left</span>}
        </div>
      </div>

      <div className="dish-foot">
        <span className="price">{rupees(dish.price)}</span>
        {qty === 0 ? (
          <button className="btn btn-hot" style={{ marginLeft: 'auto' }} disabled={out} onClick={() => add(dish)}>
            Add to tray
          </button>
        ) : (
          <div className="stepper">
            <button onClick={() => setQty(dish.id, qty - 1)} aria-label={'One less ' + dish.name}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(dish.id, qty + 1)} aria-label={'One more ' + dish.name}>+</button>
          </div>
        )}
      </div>
    </motion.article>
  )
}
