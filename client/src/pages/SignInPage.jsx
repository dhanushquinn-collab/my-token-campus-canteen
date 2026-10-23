import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { useToast } from '../state/ToastContext.jsx'

export default function SignInPage() {
  const [mode, setMode] = useState('in')
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuth()
  const { push } = useToast()
  const nav = useNavigate()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function quick(email, password) {
    setForm(f => ({ ...f, email, password }))
    setBusy(true)
    try {
      const user = await login(email, password)
      push('Signed in as ' + user.name)
      nav(user.role === 'staff' ? '/counter' : '/')
    } catch (err) {
      push(err.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    setBusy(true)
    try {
      const user = mode === 'in'
        ? await login(form.email, form.password)
        : await register(form)
      push('Signed in as ' + user.name)
      nav(user.role === 'staff' ? '/counter' : '/')
    } catch (err) {
      push(err.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 460 }}>
      <div className="page-head">
        <h1>{mode === 'in' ? 'Sign in' : 'Create an account'}</h1>
        <p>Your account keeps your tray, your order history and your ratings together.</p>
      </div>

      <div className="panel">
        {mode === 'up' && (
          <>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone, so the counter can call you</label>
              <input id="phone" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </div>
          </>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={set('password')}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
        </div>
        <button className="btn btn-hot btn-wide" onClick={submit} disabled={busy}>
          {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <button className="btn btn-quiet btn-wide" style={{ marginTop: 8 }} onClick={() => setMode(m => (m === 'in' ? 'up' : 'in'))}>
          {mode === 'in' ? 'New here? Create an account' : 'Already have one? Sign in'}
        </button>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Or walk straight in</h2>
        <p style={{ color: 'var(--tile-dim)', fontSize: 'var(--step--1)', marginTop: 4 }}>
          Two accounts are already set up. Open one in a normal window and the other
          in an incognito window to watch an order move between them.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => quick('student@canteen.edu', 'student123')}>
            As a student
          </button>
          <button className="btn" onClick={() => quick('staff@canteen.edu', 'staff123')}>
            As counter staff
          </button>
        </div>
      </div>
    </div>
  )
}
