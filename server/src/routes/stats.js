import { Router } from 'express'
import Order from '../models/Order.js'
import MenuItem from '../models/MenuItem.js'
import { auth, staffOnly } from '../middleware/auth.js'

const r = Router()

r.get('/today', auth, staffOnly, async (_req, res) => {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const orders = await Order.find({ createdAt: { $gte: from } })
  const done = orders.filter(o => o.status === 'collected')
  const counts = {}
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    for (const i of o.items) counts[i.name] = (counts[i.name] || 0) + i.qty
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }))

  const hours = Array.from({ length: 12 }, (_, i) => ({ hour: i + 8, orders: 0 }))
  for (const o of orders) {
    const slot = hours.find(h => h.hour === new Date(o.createdAt).getHours())
    if (slot) slot.orders += 1
  }

  res.json({
    orders: orders.length,
    collected: done.length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    revenue: done.reduce((s, o) => s + o.total, 0),
    top,
    hours,
    soldOut: await MenuItem.countDocuments({ available: false })
  })
})

r.post('/reset-day', auth, staffOnly, async (_req, res) => {
  await MenuItem.updateMany({}, { $set: { soldToday: 0, available: true } })
  res.json({ ok: true })
})

export default r
