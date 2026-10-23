import { load, save } from './db.js'
import { broadcast } from './socket.js'

/* With no counter staff logged in, somebody has to cook.

   Each order gets absolute timestamps for when it should reach the next
   stage. A ticker compares them against the clock, so progress survives a
   refresh instead of dying with a setTimeout. Times are compressed for a
   demo: a 12 minute dish is ready in well under a minute.

   The moment real staff advance an order by hand, its schedule is dropped
   and the timer stops interfering. */

const ACCEPT_AFTER = 8000
const COOK_AFTER = 20000
const SECONDS_PER_PREP_MINUTE = 3000

export function scheduleFor(prepMinutes) {
  const now = Date.now()
  return {
    accepted: now + ACCEPT_AFTER,
    cooking: now + COOK_AFTER,
    ready: now + COOK_AFTER + prepMinutes * SECONDS_PER_PREP_MINUTE
  }
}

function due(order, now) {
  if (!order.schedule) return null
  if (now >= order.schedule.ready && order.status !== 'ready') return 'ready'
  if (now >= order.schedule.cooking && ['placed', 'accepted'].includes(order.status)) return 'cooking'
  if (now >= order.schedule.accepted && order.status === 'placed') return 'accepted'
  return null
}

let timer = null

export function startKitchen() {
  if (timer) return
  timer = setInterval(() => {
    const db = load()
    const now = Date.now()
    let changed = false

    for (const order of db.orders) {
      if (['collected', 'cancelled'].includes(order.status)) continue
      const next = due(order, now)
      if (!next || next === order.status) continue

      order.status = next
      order.history.push({ status: next, at: new Date().toISOString() })
      if (next === 'ready') order.schedule = null
      changed = true

      broadcast('order:status', { id: order._id, status: next, at: new Date().toISOString(), token: order.token })
      broadcast('order:updated', order)
    }

    if (changed) save()
  }, 1000)
}
