import { Router } from 'express'
import MenuItem from '../models/MenuItem.js'
import Order from '../models/Order.js'
import { auth } from '../middleware/auth.js'

const r = Router()

// Rule based recommender. Runs when there is no Groq key, and as the fallback
// if Groq is unreachable, so the assistant is never a dead button.
function localAnswer(question, items) {
  const q = question.toLowerCase()
  const budget = Number((q.match(/(\d{2,4})/) || [])[1]) || 0
  let pool = items.filter(i => i.available)

  if (/veg|vegetarian|no meat/.test(q) && !/non.?veg/.test(q)) pool = pool.filter(i => i.veg)
  if (/non.?veg|chicken|egg|meat/.test(q)) pool = pool.filter(i => !i.veg)
  if (/spicy|hot|masala/.test(q)) pool = pool.filter(i => i.spice >= 2)
  if (/mild|not spicy|less spicy/.test(q)) pool = pool.filter(i => i.spice <= 1)
  if (/quick|fast|hurry|between class|10 min|5 min/.test(q)) pool = pool.filter(i => i.prepMinutes <= 8)
  if (/drink|juice|coffee|tea|chai|shake/.test(q)) pool = pool.filter(i => i.category === 'Drinks')
  if (/breakfast|morning|tiffin/.test(q)) pool = pool.filter(i => i.category === 'Breakfast')
  if (/sweet|dessert/.test(q)) pool = pool.filter(i => i.category === 'Sweets')
  if (budget) pool = pool.filter(i => i.price <= budget)

  pool = pool.sort((a, b) => (b.ratingCount ? b.ratingSum / b.ratingCount : 3) - (a.ratingCount ? a.ratingSum / a.ratingCount : 3)).slice(0, 3)
  if (!pool.length) return { reply: 'Nothing on the counter matches that right now. Try a wider budget or drop the filter.', picks: [] }

  const lead = budget ? 'Under ' + budget + ' rupees, these work:' : 'Here is what I would get:'
  const body = pool.map(i => i.name + ' at ' + i.price + ', ready in about ' + i.prepMinutes + ' minutes').join('. ')
  return { reply: lead + ' ' + body + '.', picks: pool.map(i => String(i._id)) }
}

r.post('/ask', auth, async (req, res) => {
  const question = String(req.body.question || '').slice(0, 400)
  if (!question) return res.status(400).json({ error: 'Ask something first.' })

  const items = await MenuItem.find({})
  const history = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5)
  const usual = [...new Set(history.flatMap(o => o.items.map(i => i.name)))].slice(0, 6)

  if (!process.env.GROQ_API_KEY) return res.json({ ...localAnswer(question, items), source: 'local' })

  const menuText = items.map(i =>
    [i._id, i.name, i.price, i.veg ? 'veg' : 'non-veg', 'spice ' + i.spice, i.prepMinutes + 'min', i.available ? 'available' : 'sold out'].join(' | ')
  ).join('\n')

  const system = [
    'You help students order from their college canteen in India. Prices are rupees.',
    'Recommend only from the menu below. Never invent a dish or a price.',
    'Answer in at most three sentences, plain and friendly, no markdown.',
    'Then on a final line output PICKS: followed by the ids you recommended, comma separated.',
    usual.length ? 'This student usually orders: ' + usual.join(', ') + '.' : '',
    'MENU (id | name | price | diet | spice | prep | stock):',
    menuText
  ].filter(Boolean).join('\n')

  try {
    const groq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 300,
        messages: [{ role: 'system', content: system }, { role: 'user', content: question }]
      })
    })
    if (!groq.ok) throw new Error('groq ' + groq.status)
    const data = await groq.json()
    const text = data.choices?.[0]?.message?.content || ''
    const [reply, picksLine] = text.split(/PICKS:/i)
    const picks = (picksLine || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => items.some(i => String(i._id) === s))
    res.json({ reply: reply.trim(), picks, source: 'groq' })
  } catch (err) {
    console.error('groq failed, using local recommender:', err.message)
    res.json({ ...localAnswer(question, items), source: 'local' })
  }
})

export default r
