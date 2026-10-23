import { Router } from 'express'
import MenuItem from '../models/MenuItem.js'
import Review from '../models/Review.js'
import { auth, staffOnly } from '../middleware/auth.js'

const r = Router()

r.get('/', async (req, res) => {
  const { q, category, veg, maxPrice, sort } = req.query
  const filter = {}
  if (category && category !== 'all') filter.category = category
  if (veg === 'true') filter.veg = true
  if (maxPrice) filter.price = { $lte: Number(maxPrice) }
  if (q) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { description: rx }, { tags: rx }]
  }
  const sortMap = {
    price: { price: 1 },
    priceDesc: { price: -1 },
    fastest: { prepMinutes: 1 },
    rating: { ratingSum: -1 }
  }
  const items = await MenuItem.find(filter).sort(sortMap[sort] || { available: -1, name: 1 })
  res.json(items)
})

r.get('/categories', async (_req, res) => {
  const cats = await MenuItem.distinct('category')
  res.json(cats.sort())
})

r.get('/:id', async (req, res) => {
  const item = await MenuItem.findById(req.params.id)
  if (!item) return res.status(404).json({ error: 'That dish is not on the menu.' })
  const reviews = await Review.find({ menuItem: item._id }).populate('user', 'name').sort({ createdAt: -1 }).limit(20)
  res.json({ item, reviews })
})

r.post('/', auth, staffOnly, async (req, res) => {
  const item = await MenuItem.create(req.body)
  req.app.get('io').emit('menu:changed', { id: item._id })
  res.status(201).json(item)
})

r.patch('/:id', auth, staffOnly, async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!item) return res.status(404).json({ error: 'That dish is not on the menu.' })
  req.app.get('io').emit('menu:changed', { id: item._id, available: item.available })
  res.json(item)
})

r.delete('/:id', auth, staffOnly, async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id)
  req.app.get('io').emit('menu:changed', { id: req.params.id })
  res.json({ ok: true })
})

export default r
