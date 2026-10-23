import { Router } from 'express'
import Coupon from '../models/Coupon.js'
import { auth, staffOnly } from '../middleware/auth.js'

const r = Router()

r.get('/', async (_req, res) => {
  const list = await Coupon.find({ active: true }).select('code kind value minSubtotal maxDiscount note')
  res.json(list)
})

r.post('/check', async (req, res) => {
  const { code, subtotal = 0 } = req.body
  const coupon = await Coupon.findOne({ code: String(code || '').toUpperCase() })
  if (!coupon || !coupon.active) return res.status(404).json({ error: 'No offer with that code.' })
  const discount = coupon.discountFor(subtotal)
  if (!discount) return res.status(400).json({ error: 'Spend at least ' + coupon.minSubtotal + ' to use ' + coupon.code + '.' })
  res.json({ code: coupon.code, discount, note: coupon.note })
})

r.post('/', auth, staffOnly, async (req, res) => {
  const coupon = await Coupon.create(req.body)
  res.status(201).json(coupon)
})

r.patch('/:id', auth, staffOnly, async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(coupon)
})

export default r
