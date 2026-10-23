import { DISHES, COUPONS, DEMO_USERS } from '../data/seed.js'

/* The whole canteen, kept in localStorage.

   Everything the server used to hold lives here: menu, users, orders,
   reviews. It is deliberately shaped like the API responses so that
   swapping in the real backend later means changing lib/api.js only. */

const KEY = 'token_db_v2'
const uid = p => p + Math.random().toString(36).slice(2, 9)

export const todayKey = () => new Date().toISOString().slice(0, 10)

function fresh() {
  return {
    version: 2,
    day: todayKey(),
    menu: DISHES.map(d => ({
      ...d,
      id: uid('m'),
      available: true,
      soldToday: 0,
      dailyLimit: d.dailyLimit || 0,
      ratingSum: 0,
      ratingCount: 0
    })),
    coupons: COUPONS.map(c => ({ ...c, id: uid('c'), timesUsed: 0 })),
    users: DEMO_USERS.map(u => ({ ...u, id: uid('u'), vegOnly: false })),
    orders: [],
    reviews: [],
    session: null
  }
}

let cache = null

export function load() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    cache = parsed && parsed.version === 2 ? parsed : fresh()
  } catch {
    cache = fresh()
  }
  // a new day clears the counts, the way the counter would each morning
  if (cache.day !== todayKey()) {
    cache.day = todayKey()
    cache.menu.forEach(m => {
      m.soldToday = 0
      m.available = true
    })
  }
  save()
  return cache
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch (err) {
    // quota, private mode, whatever: the app keeps working for this session
    console.warn('could not persist:', err.message)
  }
}

export function reset() {
  cache = fresh()
  save()
  return cache
}

export const newId = uid

// menu items carry their average rating the way the API returned it
export const withRating = m => ({
  ...m,
  rating: m.ratingCount ? Number((m.ratingSum / m.ratingCount).toFixed(1)) : 0
})

export const publicUser = u =>
  u && { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, vegOnly: u.vegOnly }
