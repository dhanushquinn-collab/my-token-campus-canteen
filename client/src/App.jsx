import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import TrayBar from './components/TrayBar.jsx'
// the gate only loads for people who actually see it
const Gate = lazy(() => import('./components/Gate.jsx'))
import MenuPage from './pages/MenuPage.jsx'
import DishPage from './pages/DishPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import TrackPage from './pages/TrackPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import SignInPage from './pages/SignInPage.jsx'
import CounterPage from './pages/CounterPage.jsx'
import { useAuth } from './state/AuthContext.jsx'

export default function App() {
  const [introDone, setIntroDone] = useState(true)

  useEffect(() => {
    const seen = sessionStorage.getItem('token_intro')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!seen && !still) setIntroDone(false)
  }, [])

  const finishIntro = () => {
    sessionStorage.setItem('token_intro', '1')
    setIntroDone(true)
  }

  const { user, ready } = useAuth()

  // the door order: gate, then sign in, then the counter itself
  if (!introDone) {
    return (
      <Suspense fallback={<div className="gate" />}>
        <Gate onDone={finishIntro} />
      </Suspense>
    )
  }

  if (!ready) return null

  if (!user) {
    return (
      <>
        <Nav />
        <SignInPage />
      </>
    )
  }

  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/dish/:id" element={<DishPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/signin" element={<Navigate to="/" replace />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/track/:id" element={<TrackPage />} />
        <Route path="/counter" element={<CounterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TrayBar />
    </>
  )
}
