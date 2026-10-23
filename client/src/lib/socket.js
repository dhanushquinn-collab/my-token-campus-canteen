/* Stands in for socket.io while there is no server.

   Same on / off / emit surface, so pages do not care that the events are
   now coming from the next tab over instead of a websocket. Broadcasts go
   through the storage event too, which means two browser tabs really do
   talk to each other: student in one, counter in the other. */

const handlers = new Map()
const CHANNEL = 'token_bus'

function deliver(event, payload) {
  const set = handlers.get(event)
  if (!set) return
  for (const fn of set) {
    try {
      fn(payload)
    } catch (err) {
      console.error('handler for ' + event + ' failed:', err)
    }
  }
}

window.addEventListener('storage', e => {
  if (e.key !== CHANNEL || !e.newValue) return
  try {
    const { event, payload } = JSON.parse(e.newValue)
    deliver(event, payload)
  } catch {
    /* ignore malformed messages */
  }
})

export const socket = {
  on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, new Set())
    handlers.get(event).add(fn)
    return socket
  },
  off(event, fn) {
    handlers.get(event)?.delete(fn)
    return socket
  },
  // client-to-server messages have nowhere to go; rooms are not needed
  // when every listener is in the browser already
  emit() {
    return socket
  }
}

// what the old server called io.emit
export function broadcast(event, payload) {
  deliver(event, payload)
  try {
    localStorage.setItem(CHANNEL, JSON.stringify({ event, payload, at: Date.now() }))
  } catch {
    /* other tabs miss out, this one still works */
  }
}
