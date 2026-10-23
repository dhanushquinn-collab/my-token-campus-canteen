import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { socket } from '../lib/socket.js'
import DishCard from '../components/DishCard.jsx'
import Assistant from '../components/Assistant.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { SECTION_ART } from '../lib/photo.js'

const SORTS = [
  ['', 'Counter order'],
  ['fastest', 'Ready soonest'],
  ['price', 'Cheapest first'],
  ['rating', 'Best rated']
]

export default function MenuPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [veg, setVeg] = useState(false)
  const [sort, setSort] = useState('')
  const [picks, setPicks] = useState([])
  const [queue, setQueue] = useState(null)
  const [problem, setProblem] = useState('')

  useEffect(() => {
    api('/menu/categories', { auth: false }).then(setCats).catch(() => {})
    api('/orders/meta/queue', { auth: false }).then(setQueue).catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.vegOnly) setVeg(true)
  }, [user])

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category !== 'all') params.set('category', category)
      if (veg) params.set('veg', 'true')
      if (sort) params.set('sort', sort)
      api('/menu?' + params.toString(), { auth: false })
        .then(d => {
          if (!alive) return
          setItems(d)
          setProblem('')
        })
        .catch(err => alive && setProblem(err.message))
        .finally(() => alive && setLoading(false))
    }, q ? 220 : 0)
    return () => { alive = false; clearTimeout(t) }
  }, [q, category, veg, sort])

  useEffect(() => {
    const refresh = () => api('/menu', { auth: false }).then(setItems).catch(() => {})
    socket.on('menu:changed', refresh)
    return () => socket.off('menu:changed', refresh)
  }, [])

  const shown = useMemo(() => {
    if (!picks.length) return items
    const rank = id => (picks.includes(id) ? 0 : 1)
    return [...items].sort((a, b) => rank(a.id) - rank(b.id))
  }, [items, picks])

  return (
    <div className="shell">
      <div className="page-art">
        <img src="/img/gate/poster.webp" alt="" />
        <div className="page-art-copy">
          <h1>What the counter is cooking</h1>
          <p>
            Pre-order now, walk over when your token turns up.
            {queue ? ' ' + queue.live + ' order' + (queue.live === 1 ? '' : 's') + ' in the queue right now.' : ''}
          </p>
        </div>
      </div>

      <div className="filters">
        <input
          className="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search dosa, biryani, chai…"
          aria-label="Search the menu"
        />
        <div className="chips">
          <button className="chip" data-on={String(category === 'all')} onClick={() => setCategory('all')}>Everything</button>
          {cats.map(c => (
            <button key={c} className="chip" data-on={String(category === c)} onClick={() => setCategory(c)}>{c}</button>
          ))}
          <button className="chip" data-on={String(veg)} onClick={() => setVeg(v => !v)}>Veg only</button>
        </div>
        <div className="chips">
          {SORTS.map(([v, label]) => (
            <button key={v} className="chip" data-on={String(sort === v)} onClick={() => setSort(v)}>{label}</button>
          ))}
        </div>
      </div>

      {picks.length > 0 && (
        <p style={{ color: 'var(--turmeric)', marginTop: 0 }}>
          Moved the assistant's picks to the top.{' '}
          <button className="btn btn-quiet" onClick={() => setPicks([])}>Clear</button>
        </p>
      )}

      {loading ? (
        <div className="grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" />)}</div>
      ) : problem ? (
        <div className="empty">
          <img className="empty-art" src="/img/scene/empty-tray.webp" alt="" />
          <h2>Something went wrong reading the counter</h2>
          <p>
            {problem}{' '}
            <button className="btn" onClick={() => window.location.reload()}>Try again</button>
          </p>
        </div>
      ) : items.length === 0 && !q && category === 'all' && !veg ? (
        <div className="empty">
          <img className="empty-art" src="/img/scene/empty-tray.webp" alt="" />
          <h2>The menu is empty</h2>
          <p>Hit Reset in the top bar to put the 19 dishes back on the counter.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <img className="empty-art" src="/img/scene/empty-tray.webp" alt="" />
          Nothing matches that. Clear the filters or search for something else.
        </div>
      ) : (
        <>
          {category !== 'all' && SECTION_ART[category] && (
            <div className="band">
              <img src={SECTION_ART[category]} alt="" />
              <h2>{category}</h2>
              <p>{shown.length} on the counter today</p>
            </div>
          )}
          <div className="grid">
            {shown.map(d => <DishCard key={d.id} dish={d} />)}
          </div>
        </>
      )}

      <Assistant onPicks={setPicks} />
    </div>
  )
}
