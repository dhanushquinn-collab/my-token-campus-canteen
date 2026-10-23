import { load, save, reset, newId, withRating, publicUser } from './db.js'
import { broadcast } from './socket.js'
import { startKitchen, scheduleFor } from './kitchen.js'

/* A local stand-in for the Express API.

   Every path, request body and response shape matches what the server
   returns, so pages are unaware there is no network. To go back to the real
   backend, replace the body of api() with the fetch call in this file's
   history and delete nothing else. */

const STAGES = ['placed', 'accepted', 'cooking', 'ready', 'collected']

// a touch of latency so loading states are real and not a flash
const wait = (ms = 90) => new Promise(r => setTimeout(r, ms + Math.random() * 90))

const fail = (status, error) => {
  const err = new Error(error)
  err.status = status
  throw err
}

export function getToken() {
  return localStorage.getItem('token_jwt') || ''
}

export function setToken(t) {
  if (t) localStorage.setItem('token_jwt', t)
  else localStorage.removeItem('token_jwt')
}

const currentUser = db => db.users.find(u => u.id === getToken()) || null

const requireUser = db => currentUser(db) || fail(401, 'Sign in to continue.')

const requireStaff = db => {
  const u = requireUser(db)
  if (u.role !== 'staff') fail(403, 'Counter staff only.')
  return u
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const discountFor = (coupon, subtotal) => {
  if (!coupon.active || subtotal < coupon.minSubtotal) return 0
  let d = coupon.kind === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value
  if (coupon.maxDiscount) d = Math.min(d, coupon.maxDiscount)
  return Math.min(Math.round(d), subtotal)
}

function localAnswer(question, items, usual) {
  const q = question.toLowerCase()

  // "under 80", "for 5 rupees" and "80 bucks" are budgets.
  // "ready in 10 min" is not, and used to be read as one.
  const budget = Number(
    (q.match(/(?:under|below|less than|within|budget|max|for|rs\.?|₹)\s*(\d{1,4})/) ||
      q.match(/(\d{1,4})\s*(?:rupees|rupee|rs\b|₹|bucks)/) ||
      q.match(/(\d{2,4})(?!\s*(?:min|minute|mins|minutes))/) ||
      [])[1]
  ) || 0
  let pool = items.filter(i => i.available)

  if (/veg|vegetarian|no meat/.test(q) && !/non.?veg/.test(q)) pool = pool.filter(i => i.veg)
  if (/non.?veg|chicken|egg|meat/.test(q)) pool = pool.filter(i => !i.veg)
  if (/spicy|hot|masala/.test(q)) pool = pool.filter(i => i.spice >= 2)
  if (/mild|not spicy|less spicy/.test(q)) pool = pool.filter(i => i.spice <= 1)
  if (/quick|fast|hurry|between class|10 min|5 min/.test(q)) pool = pool.filter(i => i.prepMinutes <= 8)
  if (/drink|juice|coffee|tea|chai|shake/.test(q)) pool = pool.filter(i => i.category === 'Drinks')
  if (/breakfast|morning|tiffin/.test(q)) pool = pool.filter(i => i.category === 'Breakfast')
  if (/sweet|dessert/.test(q)) pool = pool.filter(i => i.category === 'Sweets')
  if (/cheap|budget|broke/.test(q) && !budget) pool = pool.filter(i => i.price <= 50)
  if (budget) pool = pool.filter(i => i.price <= budget)

  if (/usual|always|again/.test(q) && usual.length) {
    const mine = pool.filter(i => usual.includes(i.name))
    if (mine.length) pool = mine
  }

  pool = pool
    .sort((a, b) => (b.ratingCount ? b.ratingSum / b.ratingCount : 3) - (a.ratingCount ? a.ratingSum / a.ratingCount : 3))
    .slice(0, 3)

  if (!pool.length) return { reply: 'Nothing on the counter matches that right now. Try a wider budget or drop a filter.', picks: [] }

  const lead = budget ? 'Under ' + budget + ' rupees, these work:' : 'Here is what I would get:'
  const body = pool.map(i => i.name + ' at ' + i.price + ', ready in about ' + i.prepMinutes + ' minutes').join('. ')
  return { reply: lead + ' ' + body + '.', picks: pool.map(i => i.id) }
}

const ROUTES = [
  // ---------- auth ----------
  ['POST', /^\/auth\/register$/, (db, _m, body) => {
    const { name, email, password, phone = '', role } = body
    if (!name || !email || !password) fail(400, 'Name, email and password are all needed.')
    if (password.length < 6) fail(400, 'Use at least 6 characters for the password.')
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      fail(409, 'That email is already registered. Sign in instead.')
    }
    const user = {
      id: newId('u'),
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: role === 'staff' ? 'staff' : 'student',
      vegOnly: false
    }
    db.users.push(user)
    save()
    return { token: user.id, user: publicUser(user) }
  }],

  ['POST', /^\/auth\/login$/, (db, _m, body) => {
    const user = db.users.find(u => u.email.toLowerCase() === String(body.email || '').toLowerCase())
    if (!user || user.password !== body.password) fail(401, 'Email or password is wrong.')
    return { token: user.id, user: publicUser(user) }
  }],

  ['GET', /^\/auth\/me$/, db => ({ user: publicUser(requireUser(db)) })],

  ['PATCH', /^\/auth\/me$/, (db, _m, body) => {
    const user = requireUser(db)
    if (body.name !== undefined) user.name = body.name
    if (body.phone !== undefined) user.phone = body.phone
    if (body.vegOnly !== undefined) user.vegOnly = !!body.vegOnly
    save()
    return { user: publicUser(user) }
  }],

  // ---------- menu ----------
  ['GET', /^\/menu\/categories$/, db => [...new Set(db.menu.map(m => m.category))].sort()],

  ['GET', /^\/menu\/([^/?]+)$/, (db, m) => {
    const item = db.menu.find(x => x.id === m[1])
    if (!item) fail(404, 'That dish is not on the menu.')
    const reviews = db.reviews
      .filter(r => r.menuItem === item.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(r => ({ ...r, user: { name: db.users.find(u => u.id === r.user)?.name || 'Student' } }))
    return { item: withRating(item), reviews }
  }],

  ['PATCH', /^\/menu\/([^/?]+)$/, (db, m, body) => {
    requireStaff(db)
    const item = db.menu.find(x => x.id === m[1])
    if (!item) fail(404, 'That dish is not on the menu.')
    Object.assign(item, body)
    save()
    broadcast('menu:changed', { id: item.id, available: item.available })
    return withRating(item)
  }],

  ['GET', /^\/menu$/, (db, _m, _b, query) => {
    let items = db.menu.map(withRating)
    const { q, category, veg, maxPrice, sort } = query

    if (category && category !== 'all') items = items.filter(i => i.category === category)
    if (veg === 'true') items = items.filter(i => i.veg)
    if (maxPrice) items = items.filter(i => i.price <= Number(maxPrice))
    if (q) {
      const needle = q.trim().toLowerCase()
      items = items.filter(i =>
        i.name.toLowerCase().includes(needle) ||
        i.description.toLowerCase().includes(needle) ||
        i.tags.some(t => t.toLowerCase().includes(needle)) ||
        i.category.toLowerCase().includes(needle)
      )
    }

    const sorts = {
      price: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      fastest: (a, b) => a.prepMinutes - b.prepMinutes,
      rating: (a, b) => b.rating - a.rating
    }
    items.sort(sorts[sort] || ((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name)))
    return items
  }],

  // ---------- orders ----------
  ['GET', /^\/orders\/mine$/, db => {
    const user = requireUser(db)
    return db.orders
      .filter(o => o.user === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 40)
  }],

  ['GET', /^\/orders\/meta\/queue$/, db => {
    const live = db.orders.filter(o => ['placed', 'accepted', 'cooking'].includes(o.status)).length
    return { live, extraMinutes: Math.floor(live / 4) * 2 }
  }],

  ['PATCH', /^\/orders\/([^/?]+)\/status$/, (db, m, body) => {
    requireStaff(db)
    if (![...STAGES, 'cancelled'].includes(body.status)) fail(400, 'Unknown status.')
    const order = db.orders.find(o => o._id === m[1])
    if (!order) fail(404, 'No order with that number.')
    order.status = body.status
    order.history.push({ status: body.status, at: new Date().toISOString() })
    order.schedule = null // a human took over from the timer
    save()
    broadcast('order:status', { id: order._id, status: order.status, at: new Date().toISOString(), token: order.token })
    broadcast('order:updated', order)
    return order
  }],

  ['PATCH', /^\/orders\/([^/?]+)\/cancel$/, (db, m) => {
    const user = requireUser(db)
    const order = db.orders.find(o => o._id === m[1])
    if (!order) fail(404, 'No order with that number.')
    if (order.user !== user.id) fail(403, 'That order belongs to someone else.')
    if (!['placed', 'accepted'].includes(order.status)) {
      fail(409, 'The kitchen already started this one. Talk to the counter.')
    }
    order.status = 'cancelled'
    order.history.push({ status: 'cancelled', at: new Date().toISOString() })
    order.schedule = null
    save()
    broadcast('order:status', { id: order._id, status: 'cancelled', at: new Date().toISOString(), token: order.token })
    broadcast('order:updated', order)
    return order
  }],

  ['PATCH', /^\/orders\/([^/?]+)\/collected$/, (db, m) => {
    const user = requireUser(db)
    const order = db.orders.find(o => o._id === m[1])
    if (!order) fail(404, 'No order with that number.')
    if (order.user !== user.id) fail(403, 'That order belongs to someone else.')
    if (order.status !== 'ready') fail(409, 'It is not ready yet.')
    order.status = 'collected'
    order.history.push({ status: 'collected', at: new Date().toISOString() })
    save()
    broadcast('order:status', { id: order._id, status: 'collected', at: new Date().toISOString(), token: order.token })
    broadcast('order:updated', order)
    return order
  }],

  ['GET', /^\/orders\/([^/?]+)$/, (db, m) => {
    const user = requireUser(db)
    const order = db.orders.find(o => o._id === m[1])
    if (!order) fail(404, 'No order with that number.')
    if (order.user !== user.id && user.role !== 'staff') fail(403, 'That order belongs to someone else.')
    return order
  }],

  ['GET', /^\/orders$/, (db, _m, _b, query) => {
    requireStaff(db)
    const list = query.scope === 'all'
      ? db.orders.filter(o => new Date(o.createdAt).getTime() >= startOfToday())
      : db.orders.filter(o => ['placed', 'accepted', 'cooking', 'ready'].includes(o.status))
    return [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }],

  ['POST', /^\/orders$/, (db, _m, body) => {
    const user = requireUser(db)
    const { items = [], pickupAt, note = '', couponCode = '', payment = 'counter' } = body
    if (!items.length) fail(400, 'Your tray is empty. Add something first.')

    const lines = []
    for (const line of items) {
      const dish = db.menu.find(m => m.id === line.menuItem)
      if (!dish) fail(400, 'A dish in your tray is no longer on the menu.')
      if (!dish.available) fail(409, dish.name + ' just sold out. Remove it to continue.')
      const qty = Math.max(1, Math.min(10, Number(line.qty) || 1))
      if (dish.dailyLimit && dish.soldToday + qty > dish.dailyLimit) {
        fail(409, 'Only ' + Math.max(0, dish.dailyLimit - dish.soldToday) + ' left of ' + dish.name + '.')
      }
      lines.push({ menuItem: dish.id, name: dish.name, price: dish.price, qty, veg: dish.veg })
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
    let discount = 0
    let code = ''
    if (couponCode) {
      const coupon = db.coupons.find(c => c.code === couponCode.toUpperCase())
      if (!coupon || !coupon.active) fail(400, 'That code is not valid.')
      discount = discountFor(coupon, subtotal)
      if (!discount) fail(400, 'This order does not meet the terms for ' + coupon.code + '.')
      code = coupon.code
      coupon.timesUsed += 1
    }

    const prepMinutes = Math.max(
      5,
      ...lines.map(l => db.menu.find(m => m.id === l.menuItem).prepMinutes)
    )
    const when = pickupAt ? new Date(pickupAt) : new Date(Date.now() + prepMinutes * 60000)
    if (isNaN(when.getTime())) fail(400, 'Pick a valid collection time.')

    const madeToday = db.orders.filter(o => new Date(o.createdAt).getTime() >= startOfToday()).length
    const now = new Date()

    const order = {
      _id: newId('o'),
      token: String(madeToday + 1).padStart(3, '0'),
      user: user.id,
      items: lines,
      subtotal,
      discount,
      total: subtotal - discount,
      couponCode: code,
      pickupAt: when.toISOString(),
      note,
      payment,
      prepMinutes,
      status: 'placed',
      history: [{ status: 'placed', at: now.toISOString() }],
      rated: false,
      createdAt: now.toISOString(),
      schedule: scheduleFor(prepMinutes)
    }

    lines.forEach(l => {
      const dish = db.menu.find(m => m.id === l.menuItem)
      dish.soldToday += l.qty
      if (dish.dailyLimit && dish.soldToday >= dish.dailyLimit) dish.available = false
    })

    db.orders.push(order)
    save()
    broadcast('order:new', { ...order, user: { name: user.name, phone: user.phone } })
    return order
  }],

  // ---------- coupons ----------
  ['GET', /^\/coupons$/, db => db.coupons.filter(c => c.active)],

  ['POST', /^\/coupons\/check$/, (db, _m, body) => {
    const coupon = db.coupons.find(c => c.code === String(body.code || '').toUpperCase())
    if (!coupon || !coupon.active) fail(404, 'No offer with that code.')
    const discount = discountFor(coupon, body.subtotal || 0)
    if (!discount) fail(400, 'Spend at least ' + coupon.minSubtotal + ' to use ' + coupon.code + '.')
    return { code: coupon.code, discount, note: coupon.note }
  }],

  // ---------- reviews ----------
  ['POST', /^\/reviews$/, (db, _m, body) => {
    const user = requireUser(db)
    const order = db.orders.find(o => o._id === body.orderId)
    if (!order) fail(404, 'No order with that number.')
    if (order.user !== user.id) fail(403, 'That order belongs to someone else.')
    if (order.status !== 'collected') fail(409, 'You can rate a meal once you have collected it.')
    if (order.rated) fail(409, 'You already rated this order.')

    for (const entry of body.ratings || []) {
      if (!order.items.some(i => i.menuItem === entry.menuItem)) continue
      const stars = Math.max(1, Math.min(5, Number(entry.stars)))
      db.reviews.push({
        _id: newId('r'),
        menuItem: entry.menuItem,
        user: user.id,
        order: order._id,
        stars,
        text: entry.text || '',
        createdAt: new Date().toISOString()
      })
      const dish = db.menu.find(m => m.id === entry.menuItem)
      if (dish) {
        dish.ratingSum += stars
        dish.ratingCount += 1
      }
    }
    order.rated = true
    save()
    broadcast('menu:changed', {})
    return { ok: true }
  }],

  // ---------- counter stats ----------
  ['GET', /^\/stats\/today$/, db => {
    requireStaff(db)
    const orders = db.orders.filter(o => new Date(o.createdAt).getTime() >= startOfToday())
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

    return {
      orders: orders.length,
      collected: done.length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      revenue: done.reduce((s, o) => s + o.total, 0),
      top,
      hours,
      soldOut: db.menu.filter(m => !m.available).length
    }
  }],

  ['POST', /^\/stats\/reset-day$/, db => {
    requireStaff(db)
    db.menu.forEach(m => {
      m.soldToday = 0
      m.available = true
    })
    save()
    broadcast('menu:changed', {})
    return { ok: true }
  }],

  ['POST', /^\/stats\/reset-all$/, () => {
    reset()
    setToken('')
    broadcast('menu:changed', {})
    return { ok: true }
  }],

  // ---------- assistant ----------
  ['POST', /^\/ai\/ask$/, (db, _m, body) => {
    const user = requireUser(db)
    const question = String(body.question || '').slice(0, 400)
    if (!question) fail(400, 'Ask something first.')
    const usual = [
      ...new Set(
        db.orders
          .filter(o => o.user === user.id)
          .slice(-5)
          .flatMap(o => o.items.map(i => i.name))
      )
    ]
    return { ...localAnswer(question, db.menu.map(withRating), usual), source: 'local' }
  }]
]

export async function api(path, { method = 'GET', body } = {}) {
  await wait()

  const [rawPath, rawQuery = ''] = path.split('?')
  const query = Object.fromEntries(new URLSearchParams(rawQuery))
  const db = load()

  for (const [verb, pattern, handler] of ROUTES) {
    if (verb !== method) continue
    const match = rawPath.match(pattern)
    if (match) return handler(db, match, body || {}, query)
  }

  throw new Error('No route at ' + method + ' ' + rawPath)
}

startKitchen()
