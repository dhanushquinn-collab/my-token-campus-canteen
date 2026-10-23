import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'

/* The gate. Photographic layers on a perspective stage, each one moving at its
   own depth, holding until you click.

   back  wall ....... barely moves
         counter .... moves a little
         thali ...... floats, tilts toward the cursor
         steam ...... drifts up through everything
   front rays, dust . screen-blended on top                        */

const LAYERS = {
  wall: 8,
  counter: 20,
  thali: 40,
  steamA: 26,
  steamB: 32,
  rays: 14,
  dust: 58
}

function useDepth(ox, oy, depth) {
  return {
    x: useTransform(ox, v => v * depth),
    y: useTransform(oy, v => v * depth * 0.6)
  }
}

export default function Gate({ onDone }) {
  const [ready, setReady] = useState(false)
  const [entering, setEntering] = useState(false)
  const [wipe, setWipe] = useState(null) // null -> 'cover' -> 'reveal'
  const [still, setStill] = useState(false)

  const loaded = useRef(0)
  const enterBtn = useRef()

  const ox = useMotionValue(0)
  const oy = useMotionValue(0)
  const pointer = useRef({ x: 0, y: 0 })

  const wall = useDepth(ox, oy, LAYERS.wall)
  const counter = useDepth(ox, oy, LAYERS.counter)
  const thali = useDepth(ox, oy, LAYERS.thali)
  const steamA = useDepth(ox, oy, LAYERS.steamA)
  const steamB = useDepth(ox, oy, LAYERS.steamB)
  const rays = useDepth(ox, oy, LAYERS.rays)
  const dust = useDepth(ox, oy, LAYERS.dust)

  const tiltX = useTransform(oy, v => v * -5)
  const tiltY = useTransform(ox, v => v * 7)

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // one loop drives everything: a slow drift so it breathes on touch screens,
  // plus whatever the pointer is doing, eased in rather than snapped
  useEffect(() => {
    if (still) return
    let raf
    let t = 0
    const cur = { x: 0, y: 0 }
    const loop = () => {
      t += 0.016
      const dx = Math.sin(t * 0.45) * 0.3
      const dy = Math.cos(t * 0.33) * 0.22
      cur.x += (pointer.current.x + dx - cur.x) * 0.055
      cur.y += (pointer.current.y + dy - cur.y) * 0.055
      ox.set(cur.x)
      oy.set(cur.y)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ox, oy, still])

  const track = e => {
    pointer.current = {
      x: (e.clientX / window.innerWidth - 0.5) * 2,
      y: (e.clientY / window.innerHeight - 0.5) * 2
    }
  }

  const enter = () => {
    if (entering) return
    setEntering(true)
    setTimeout(() => setWipe('cover'), 620)
  }

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        enter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entering])

  const onLoad = () => {
    loaded.current += 1
    if (loaded.current >= 3) setReady(true)
  }

  // depth layers each get an entrance, a resting state, and a way out
  const layer = (from, delay, out) => ({
    in: { ...from, opacity: 0 },
    rest: { opacity: 1, scale: 1, y: 0, transition: { delay, duration: 1.2, ease: [0.16, 1, 0.3, 1] } },
    out: { ...out, opacity: 0, transition: { duration: 0.65, ease: [0.6, 0, 0.4, 1] } }
  })

  const state = entering ? 'out' : ready ? 'rest' : 'in'

  if (still) {
    return (
      <div className="gate gate-still">
        <img src="/img/gate/poster.webp" alt="" className="gate-layer" />
        <div className="gate-copy">
          <h1>Token</h1>
          <p>Order before you walk over. Collect by number.</p>
          <button className="gate-enter" onClick={onDone}>Enter</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <AnimatePresence>
        {wipe !== 'reveal' && (
          <motion.div
            className="gate"
            onPointerMove={track}
            onClick={enter}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="gate-stage">
              <motion.img
                src="/img/gate/wall.webp"
                alt=""
                onLoad={onLoad}
                className="gate-layer gate-wall"
                style={{ x: wall.x, y: wall.y }}
                variants={layer({ scale: 1.16 }, 0, { scale: 1.3 })}
                initial="in"
                animate={state}
              />

              <motion.img
                src="/img/gate/counter.webp"
                alt=""
                onLoad={onLoad}
                className="gate-layer gate-counter"
                style={{ x: counter.x, y: counter.y }}
                variants={layer({ scale: 1.1, y: 50 }, 0.22, { scale: 1.75, y: 90 })}
                initial="in"
                animate={state}
              />

              <motion.img
                src="/img/gate/steam-b.webp"
                alt=""
                className="gate-layer gate-steam gate-steam-b"
                style={{ x: steamB.x, y: steamB.y }}
                variants={layer({ scale: 1.1, y: 60 }, 1.0, { scale: 1.5, y: -40 })}
                initial="in"
                animate={state}
              />

              <motion.img
                src="/img/gate/thali.webp"
                alt=""
                onLoad={onLoad}
                className="gate-layer gate-thali"
                style={{ x: thali.x, y: thali.y, rotateX: tiltX, rotateY: tiltY }}
                variants={layer({ scale: 0.72, y: -130 }, 0.48, { scale: 3.1, y: 40 })}
                initial="in"
                animate={state}
              />

              <motion.img
                src="/img/gate/steam-a.webp"
                alt=""
                className="gate-layer gate-steam gate-steam-a"
                style={{ x: steamA.x, y: steamA.y }}
                variants={layer({ scale: 1.05, y: 80 }, 1.15, { scale: 1.6, y: -60 })}
                initial="in"
                animate={state}
              />

              <motion.img
                src="/img/gate/rays.webp"
                alt=""
                className="gate-layer gate-rays"
                style={{ x: rays.x, y: rays.y }}
                variants={layer({ scale: 1.2 }, 0.85, { scale: 1.4 })}
                initial="in"
                animate={state}
              />

              <motion.img
                src="/img/gate/dust.webp"
                alt=""
                className="gate-layer gate-dust"
                style={{ x: dust.x, y: dust.y }}
                variants={layer({ scale: 1.05 }, 1.35, { scale: 1.9 })}
                initial="in"
                animate={state}
              />

              <div className="gate-vignette" />
            </div>

            <motion.div
              className="gate-copy"
              animate={entering ? { opacity: 0, y: -26 } : {}}
              transition={{ duration: 0.4 }}
            >
              <motion.h1
                initial={{ opacity: 0, y: 30, letterSpacing: '0.16em' }}
                animate={ready ? { opacity: 1, y: 0, letterSpacing: '-0.06em' } : {}}
                transition={{ delay: 1.7, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                Token
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={ready ? { opacity: 1 } : {}}
                transition={{ delay: 2.15, duration: 0.6 }}
              >
                Order before you walk over. Collect by number.
              </motion.p>

              <motion.button
                ref={enterBtn}
                className="gate-enter"
                onClick={enter}
                initial={{ opacity: 0 }}
                animate={ready ? { opacity: 1 } : {}}
                transition={{ delay: 2.6, duration: 0.6 }}
              >
                <span className="gate-ring" />
                Tap to enter
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {wipe && (
        <motion.div
          className="wipe"
          initial={{ y: '100%' }}
          animate={{ y: wipe === 'cover' ? '0%' : '-100%' }}
          transition={{ duration: wipe === 'cover' ? 0.4 : 0.6, ease: [0.7, 0, 0.2, 1] }}
          onAnimationComplete={() => {
            if (wipe === 'cover') {
              setWipe('reveal')
              onDone()
            }
          }}
        />
      )}
    </>
  )
}
