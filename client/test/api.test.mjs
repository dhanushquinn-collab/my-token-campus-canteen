// Run the real lib/api.js against a fake localStorage, in node.
const store = new Map()
global.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
}
global.window = { addEventListener() {}, confirm: () => true }

const { api, setToken, getToken } = await import('../src/lib/api.js')

let pass = 0, fail = 0
const ok = (label, cond, extra='') => {
  if (cond) { pass++; console.log('  pass  ' + label) }
  else { fail++; console.log('  FAIL  ' + label + (extra ? '  -> ' + extra : '')) }
}
const throws = async (label, fn, needle) => {
  try { await fn(); fail++; console.log('  FAIL  ' + label + ' (did not throw)') }
  catch (e) {
    if (!needle || e.message.includes(needle)) { pass++; console.log('  pass  ' + label) }
    else { fail++; console.log('  FAIL  ' + label + ' -> got: ' + e.message) }
  }
}

console.log('\nMENU')
const menu = await api('/menu')
ok('19 dishes seeded', menu.length === 19, menu.length)
ok('dishes have ids', menu.every(m => m.id))
ok('categories', (await api('/menu/categories')).join() === 'Breakfast,Drinks,Meals,Snacks,Sweets')
ok('search finds dosa', (await api('/menu?q=dosa')).length === 1)
ok('search is case-insensitive', (await api('/menu?q=DOSA')).length === 1)
ok('search matches tags', (await api('/menu?q=cheap')).length > 0)
ok('search miss returns none', (await api('/menu?q=zzzz')).length === 0)
ok('veg filter', (await api('/menu?veg=true')).every(m => m.veg))
ok('category filter', (await api('/menu?category=Drinks')).every(m => m.category === 'Drinks'))
const byPrice = await api('/menu?sort=price')
ok('sort by price', byPrice[0].price <= byPrice.at(-1).price)
const fastest = await api('/menu?sort=fastest')
ok('sort by prep time', fastest[0].prepMinutes <= fastest.at(-1).prepMinutes)

console.log('\nAUTH')
await throws('menu detail 404', () => api('/menu/nope'), 'not on the menu')
await throws('orders need a session', () => api('/orders/mine'), 'Sign in')
await throws('bad password rejected', () => api('/auth/login', {method:'POST', body:{email:'student@canteen.edu', password:'wrong'}}), 'wrong')
const login = await api('/auth/login', { method:'POST', body:{ email:'student@canteen.edu', password:'student123' } })
ok('demo student logs in', login.user.name === 'Dhanush J')
setToken(login.token)
ok('me returns the session', (await api('/auth/me')).user.email === 'student@canteen.edu')
await throws('duplicate email blocked', () => api('/auth/register', {method:'POST', body:{name:'X', email:'student@canteen.edu', password:'abcdef'}}), 'already registered')
await throws('short password blocked', () => api('/auth/register', {method:'POST', body:{name:'X', email:'new@x.com', password:'abc'}}), 'at least 6')
const reg = await api('/auth/register', { method:'POST', body:{ name:'New Student', email:'new@x.com', password:'abcdef' } })
ok('registration works', reg.user.role === 'student')

console.log('\nCOUPONS')
ok('offers listed', (await api('/coupons')).length === 3)
await throws('unknown code', () => api('/coupons/check', {method:'POST', body:{code:'NOPE', subtotal:200}}), 'No offer')
await throws('below minimum', () => api('/coupons/check', {method:'POST', body:{code:'FIRSTTRAY', subtotal:20}}), 'Spend at least')
const disc = await api('/coupons/check', { method:'POST', body:{ code:'FIRSTTRAY', subtotal:200 } })
ok('percent cap applied (20% of 200 capped at 40)', disc.discount === 40, disc.discount)

console.log('\nORDERS')
await throws('empty tray rejected', () => api('/orders', {method:'POST', body:{items:[]}}), 'tray is empty')
const dosa = menu.find(m => m.name === 'Masala Dosa')
const chai = menu.find(m => m.name === 'Masala Chai')
const order = await api('/orders', { method:'POST', body:{
  items:[{menuItem: dosa.id, qty:2}, {menuItem: chai.id, qty:1}],
  pickupAt: new Date(Date.now()+900000).toISOString(), couponCode:'CHAI10'
}})
ok('token number is 001', order.token === '001', order.token)
ok('subtotal correct (60*2 + 15)', order.subtotal === 135, order.subtotal)
ok('discount applied', order.discount === 10, order.discount)
ok('total correct', order.total === 125, order.total)
ok('starts at placed', order.status === 'placed')
ok('kitchen scheduled it', !!order.schedule)
ok('sold counter moved', (await api('/menu')).find(m => m.id === dosa.id).soldToday === 2)
ok('order appears in mine', (await api('/orders/mine')).length === 1)
ok('order fetch by id', (await api('/orders/' + order._id)).token === '001')
const second = await api('/orders', { method:'POST', body:{ items:[{menuItem: chai.id, qty:1}] } })
ok('second token is 002', second.token === '002', second.token)
ok('queue counts live orders', (await api('/orders/meta/queue')).live === 2)

console.log('\nPERMISSIONS')
await throws('student cannot see the queue', () => api('/orders?scope=live'), 'staff only')
await throws('student cannot change status', () => api('/orders/'+order._id+'/status', {method:'PATCH', body:{status:'ready'}}), 'staff only')
await throws('cannot rate before collecting', () => api('/reviews', {method:'POST', body:{orderId: order._id, ratings:[]}}), 'collected')

console.log('\nSTAFF')
const staff = await api('/auth/login', { method:'POST', body:{ email:'staff@canteen.edu', password:'staff123' } })
setToken(staff.token)
ok('queue visible to staff', (await api('/orders?scope=live')).length === 2)
const advanced = await api('/orders/'+order._id+'/status', { method:'PATCH', body:{status:'ready'} })
ok('status advanced', advanced.status === 'ready')
ok('history recorded', advanced.history.at(-1).status === 'ready')
ok('timer handed over to staff', advanced.schedule === null)
const soldOut = await api('/menu/'+dosa.id, { method:'PATCH', body:{ available:false } })
ok('can mark sold out', soldOut.available === false)
const stats = await api('/stats/today')
ok('stats count orders', stats.orders === 2, stats.orders)
ok('top sellers ranked', stats.top[0].qty === 2 && stats.top.length === 2, JSON.stringify(stats.top))

console.log('\nSOLD OUT + COLLECT + RATE')
setToken(login.token)
await throws('cannot order a sold-out dish', () => api('/orders', {method:'POST', body:{items:[{menuItem:dosa.id, qty:1}]}}), 'sold out')
const collected = await api('/orders/'+order._id+'/collected', { method:'PATCH' })
ok('student marks collected', collected.status === 'collected')
await api('/reviews', { method:'POST', body:{ orderId: order._id, ratings:[{menuItem: dosa.id, stars:5}] } })
const rated = (await api('/menu')).find(m => m.id === dosa.id)
ok('rating recorded', rated.rating === 5 && rated.ratingCount === 1, rated.rating)
await throws('cannot rate twice', () => api('/reviews', {method:'POST', body:{orderId: order._id, ratings:[]}}), 'already rated')
ok('reviews on dish page', (await api('/menu/'+dosa.id)).reviews.length === 1)
const cancelled = await api('/orders/'+second._id+'/cancel', { method:'PATCH' })
ok('cancel works while waiting', cancelled.status === 'cancelled')
await throws('cannot cancel a collected order', () => api('/orders/'+order._id+'/cancel', {method:'PATCH'}), 'already started')

console.log('\nASSISTANT')
const a1 = await api('/ai/ask', { method:'POST', body:{ question:'something filling under 80' } })
ok('budget respected', a1.picks.length > 0 && a1.reply.includes('80'))
const a2 = await api('/ai/ask', { method:'POST', body:{ question:'quickest veg thing' } })
ok('quick + veg answered', a2.picks.length > 0)
const a3 = await api('/ai/ask', { method:'POST', body:{ question:'chicken biryani for 5 rupees' } })
ok('impossible budget handled', a3.picks.length === 0, a3.reply)
const a4 = await api('/ai/ask', { method:'POST', body:{ question:'something ready in 10 min' } })
ok('"10 min" is not read as a budget', a4.picks.length > 0, a4.reply)
const a5 = await api('/ai/ask', { method:'POST', body:{ question:'anything under 30 rupees' } })
ok('under 30 filters correctly', a5.picks.length > 0 && a5.reply.includes('30'), a5.reply)

console.log('\nPERSISTENCE')
ok('data survives in storage', JSON.parse(store.get('token_db_v2')).orders.length === 2)

console.log('\n' + pass + ' passed, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
