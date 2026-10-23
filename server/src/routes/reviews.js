import { Router } from 'express'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import MenuItem from '../models/MenuItem.js'
import { auth } from '../middleware/auth.js'

const r = Router()

r.post('/', auth, async (req, res) => {
  const { orderId, ratings = [] } = req.body
  const order = await Order.findById(orderId)
  if (!order) return res.status(404).json({ error: 'No order with that number.' })
  if (String(order.user) !== String(req.user._id)) return res.status(403).json({ error: 'That order belongs to someone else.' })
  if (order.status !== 'collected') return res.status(409).json({ error: 'You can rate a meal once you have collected it.' })
  if (order.rated) return res.status(409).json({ error: 'You already rated this order.' })

  for (const entry of ratings) {
    const stars = Math.max(1, Math.min(5, Number(entry.stars)))
    if (!order.items.some(i => String(i.menuItem) === String(entry.menuItem))) continue
    await Review.create({ menuItem: entry.menuItem, user: req.user._id, order: order._id, stars, text: entry.text || '' })
    await MenuItem.updateOne({ _id: entry.menuItem }, { $inc: { ratingSum: stars, ratingCount: 1 } })
  }
  order.rated = true
  await order.save()
  res.status(201).json({ ok: true })
})

export default r
