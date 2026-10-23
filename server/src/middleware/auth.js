import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

export async function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.id)
    if (!user) return res.status(401).json({ error: 'That account no longer exists.' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Your session expired. Sign in again.' })
  }
}

export function staffOnly(req, res, next) {
  if (req.user?.role !== 'staff') return res.status(403).json({ error: 'Counter staff only.' })
  next()
}
