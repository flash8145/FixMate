import dns from 'node:dns'
import mongoose from 'mongoose'
import { env } from './env.js'

// Some ISP/router DNS servers can't resolve the SRV records that
// mongodb+srv:// needs. Point Node's resolver at public DNS as a fallback.
dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()])

export async function connectDB() {
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected')
  })
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message)
  })

  await mongoose.connect(env.MONGO_URI)
}
