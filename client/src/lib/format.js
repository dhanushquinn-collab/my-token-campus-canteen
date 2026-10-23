export const rupees = n => '\u20B9' + Number(n || 0).toLocaleString('en-IN')

export const clock = d => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

export const day = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export function minutesUntil(d) {
  return Math.max(0, Math.round((new Date(d) - Date.now()) / 60000))
}

export function slotOptions(count = 8, step = 10) {
  const out = []
  const now = new Date()
  now.setSeconds(0, 0)
  now.setMinutes(now.getMinutes() + (step - (now.getMinutes() % step)))
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getTime() + i * step * 60000)
    out.push(d)
  }
  return out
}

export const STAGE_LABELS = {
  placed: 'Order sent to the counter',
  accepted: 'Counter accepted it',
  cooking: 'On the stove',
  ready: 'Ready, come collect',
  collected: 'Collected',
  cancelled: 'Cancelled'
}
