import { Router } from 'express'
import mongoose from 'mongoose'
import Order, { STAGES } from '../models/Order.js'
import MenuItem from '../models/MenuItem.js'
import Coupon from '../models/Coupon.js'
import { auth, staffOnly } from '../middleware/auth.js'

const r = Router()

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function nextToken() {
  const count = await Order.countDocuments({ createdAt: { $gte: startOfToday() } })
  return String(count + 1).padStart(3, '0')
}

// Student places an order
r.post('/', auth, async (req, res) => {
  const { items = [], pickupAt, note = '', couponCode = '', payment = 'counter' } = req.body
  if (!items.length) return res.status(400).json({ error: 'Your tray is empty. Add something first.' })

  const ids = items.map(i => i.menuItem)
  if (ids.some(id => !mongoose.isValidObjectId(id))) return res.status(400).json({ error: 'One of those dishes is not valid.' })
  const docs = await MenuItem.find({ _id: { $in: ids } })

  const lines = []
  for (const line of items) {
    const doc = docs.find(d => String(d._id) === String(line.menuItem))
    if (!doc) return res.status(400).json({ error: 'A dish in your tray is no longer on the menu.' })
    if (!doc.available) return res.status(409).json({ error: doc.name + ' just sold out. Remove it to continue.' })
    if (doc.dailyLimit && doc.soldToday + line.qty > doc.dailyLimit) {
      return res.status(409).json({ error: 'Only ' + Math.max(0, doc.dailyLimit - doc.soldToday) + ' left of ' + doc.name + '.' })
    }
    const qty = Math.max(1, Math.min(10, Number(line.qty) || 1))
    lines.push({ menuItem: doc._id, name: doc.name, price: doc.price, qty, veg: doc.veg })
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  let discount = 0
  let code = ''
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() })
    if (!coupon || !coupon.active) return res.status(400).json({ error: 'That code is not valid.' })
    discount = coupon.discountFor(subtotal)
    if (!discount) return res.status(400).json({ error: 'This order does not meet the terms for ' + coupon.code + '.' })
    code = coupon.code
    coupon.timesUsed += 1
    await coupon.save()
  }

  const prepMinutes = Math.max(...lines.map(l => docs.find(d => String(d._id) === String(l.menuItem)).prepMinutes), 5)
  const when = pickupAt ? new Date(pickupAt) : new Date(Date.now() + prepMinutes * 60000)
  if (isNaN(when)) return res.status(400).json({ error: 'Pick a valid collection time.' })

  const order = await Order.create({
    user: req.user._id,
    token: await nextToken(),
    items: lines,
    subtotal,
    discount,
    total: subtotal - discount,
    couponCode: code,
    pickupAt: when,
    note,
    payment,
    prepMinutes,
    history: [{ status: 'placed', at: new Date() }]
  })

  await Promise.all(lines.map(l => MenuItem.updateOne({ _id: l.menuItem }, { $inc: { soldToday: l.qty } })))

  const populated = await order.populate('user', 'name phone')
  req.app.get('io').to('staff').emit('order:new', populated)
  res.status(201).json(order)
})

// Student's own orders
r.get('/mine', auth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(40)
  res.json(orders)
})

r.get('/:id', auth, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name phone')
  if (!order) return res.status(404).json({ error: 'No order with that number.' })
  const mine = String(order.user._id) === String(req.user._id)
  if (!mine && req.user.role !== 'staff') return res.status(403).json({ error: 'That order belongs to someone else.' })
  res.json(order)
})

// Counter queue
r.get('/', auth, staffOnly, async (req, res) => {
  const { scope = 'live' } = req.query
  const filter = scope === 'live'
    ? { status: { $in: ['placed', 'accepted', 'cooking', 'ready'] } }
    : { createdAt: { $gte: startOfToday() } }
  const orders = await Order.find(filter).populate('user', 'name phone').sort({ createdAt: 1 })
  res.json(orders)
})

// Counter advances the order
r.patch('/:id/status', auth, staffOnly, async (req, res) => {
  const { status } = req.body
  if (![...STAGES, 'cancelled'].includes(status)) return res.status(400).json({ error: 'Unknown status.' })
  const order = await Order.findById(req.params.id).populate('user', 'name phone')
  if (!order) return res.status(404).json({ error: 'No order with that number.' })
  order.status = status
  order.history.push({ status, at: new Date() })
  await order.save()
  const io = req.app.get('io')
  io.to('order:' + order._id).emit('order:status', { id: String(order._id), status, at: new Date(), token: order.token })
  io.to('staff').emit('order:updated', order)
  res.json(order)
})

// Student cancels, only before cooking starts
r.patch('/:id/cancel', auth, async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ error: 'No order with that number.' })
  if (String(order.user) !== String(req.user._id)) return res.status(403).json({ error: 'That order belongs to someone else.' })
  if (!['placed', 'accepted'].includes(order.status)) {
    return res.status(409).json({ error: 'The kitchen already started this one. Talk to the counter.' })
  }
  order.status = 'cancelled'
  order.history.push({ status: 'cancelled', at: new Date() })
  await order.save()
  const io = req.app.get('io')
  io.to('staff').emit('order:updated', order)
  io.to('order:' + order._id).emit('order:status', { id: String(order._id), status: 'cancelled', at: new Date(), token: order.token })
  res.json(order)
})

// Live queue depth, used for honest wait times
r.get('/meta/queue', async (_req, res) => {
  const live = await Order.countDocuments({ status: { $in: ['placed', 'accepted', 'cooking'] } })
  res.json({ live, extraMinutes: Math.floor(live / 4) * 2 })
})

export default r
