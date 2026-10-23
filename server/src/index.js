import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import menuRoutes from './routes/menu.js'
import orderRoutes from './routes/orders.js'
import couponRoutes from './routes/coupons.js'
import reviewRoutes from './routes/reviews.js'
import statsRoutes from './routes/stats.js'
import aiRoutes from './routes/ai.js'

const app = express()
const server = http.createServer(app)
const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')

const io = new Server(server, { cors: { origin, credentials: true } })
app.set('io', io)

app.use(cors({ origin, credentials: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true, at: new Date() }))
app.use('/api/auth', authRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/ai', aiRoutes)

app.use((req, res) => res.status(404).json({ error: 'No route at ' + req.path }))
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Something broke on our side. Try again.' })
})

io.on('connection', socket => {
  socket.on('watch:order', id => socket.join('order:' + id))
  socket.on('unwatch:order', id => socket.leave('order:' + id))
  socket.on('join:staff', () => socket.join('staff'))
})

const PORT = process.env.PORT || 5000

connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/token')
  .then(() => server.listen(PORT, () => console.log('counter open on http://localhost:' + PORT)))
  .catch(err => {
    console.error('\n  Could not connect to MongoDB.')
    console.error('  ' + err.message + '\n')
    if (!process.env.MONGO_URI) {
      console.error('  No MONGO_URI is set. Copy server/.env.example to server/.env')
      console.error('  and put your connection string in it.\n')
    } else if (process.env.MONGO_URI.startsWith('mongodb+srv')) {
      console.error('  You are using a mongodb+srv:// string. If this hangs or fails to')
      console.error('  resolve, switch to the direct mongodb:// form from .env.example.\n')
    }
    process.exit(1)
  })
