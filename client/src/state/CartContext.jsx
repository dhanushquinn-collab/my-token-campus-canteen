import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const Ctx = createContext(null)
export const useCart = () => useContext(Ctx)

const KEY = 'token_tray'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const add = dish =>
    setItems(prev => {
      const found = prev.find(i => i.id === dish.id)
      if (found) return prev.map(i => (i.id === dish.id ? { ...i, qty: Math.min(10, i.qty + 1) } : i))
      return [...prev, { id: dish.id, name: dish.name, price: dish.price, veg: dish.veg, prepMinutes: dish.prepMinutes, glyph: dish.glyph, qty: 1 }]
    })

  const setQty = (id, qty) =>
    setItems(prev => (qty <= 0 ? prev.filter(i => i.id !== id) : prev.map(i => (i.id === id ? { ...i, qty: Math.min(10, qty) } : i))))

  const remove = id => setItems(prev => prev.filter(i => i.id !== id))
  const clear = () => setItems([])
  const qtyOf = id => items.find(i => i.id === id)?.qty || 0

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items])
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items])
  const prepMinutes = useMemo(() => items.reduce((m, i) => Math.max(m, i.prepMinutes || 8), 5), [items])

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, clear, qtyOf, subtotal, count, prepMinutes }}>
      {children}
    </Ctx.Provider>
  )
}
