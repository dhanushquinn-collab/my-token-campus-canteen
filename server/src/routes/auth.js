import { Router } from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { auth, sign } from '../middleware/auth.js'

const r = Router()

r.post('/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are all needed.' })
  if (password.length < 6) return res.status(400).json({ error: 'Use at least 6 characters for the password.' })
  const exists = await User.findOne({ email: email.toLowerCase() })
  if (exists) return res.status(409).json({ error: 'That email is already registered. Sign in instead.' })
  const user = await User.create({
    name,
    email,
    phone: phone || '',
    password: await bcrypt.hash(password, 10),
    role: role === 'staff' ? 'staff' : 'student'
  })
  res.status(201).json({ token: sign(user), user: user.toSafe() })
})

r.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email: (email || '').toLowerCase() })
  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ error: 'Email or password is wrong.' })
  }
  res.json({ token: sign(user), user: user.toSafe() })
})

r.get('/me', auth, (req, res) => res.json({ user: req.user.toSafe() }))

r.patch('/me', auth, async (req, res) => {
  const { name, phone, vegOnly } = req.body
  if (name !== undefined) req.user.name = name
  if (phone !== undefined) req.user.phone = phone
  if (vegOnly !== undefined) req.user.vegOnly = !!vegOnly
  await req.user.save()
  res.json({ user: req.user.toSafe() })
})

export default r
