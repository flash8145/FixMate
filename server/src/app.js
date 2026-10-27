import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import authRoutes from './modules/auth/auth.route.js'
import categoryRoutes from './modules/categories/category.route.js'
import workerRoutes from './modules/workers/workers.route.js'
import bookingRoutes from './modules/bookings/bookings.route.js'
import reviewRoutes from './modules/reviews/reviews.route.js'
import adminRoutes from './modules/admin/admin.route.js'
import aiRoutes from './modules/ai/ai.route.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors({ origin: env.CLIENT_ORIGIN }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/ai', aiRoutes)

app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } })
})

app.use(errorHandler)

export default app
