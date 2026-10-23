import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { api } from '../lib/api.js'

export default function Nav() {
  const { user, logout } = useAuth()

  async function resetAll() {
    if (!window.confirm('Wipe all local orders, accounts and ratings, and start fresh?')) return
    await api('/stats/reset-all', { method: 'POST' })
    window.location.href = '/'
  }

  const { pathname } = useLocation()
  const on = p => String(pathname === p)

  return (
    <header className="nav">
      <Link to="/" className="brand">
        <span className="brand-dot" />
        Token
      </Link>
      <nav className="nav-links">
        <Link className="nav-link" data-on={on('/')} to="/">Menu</Link>
        {user && <Link className="nav-link" data-on={on('/orders')} to="/orders">Orders</Link>}
        {user?.role === 'staff' && <Link className="nav-link" data-on={on('/counter')} to="/counter">Counter</Link>}
        {user && <button className="btn btn-quiet" onClick={resetAll} title="Clear the local data">Reset</button>}
        {user
          ? <button className="btn btn-quiet" onClick={logout}>Sign out</button>
          : null}
      </nav>
    </header>
  )
}
