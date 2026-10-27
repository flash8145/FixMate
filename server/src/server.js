import { env } from './config/env.js'
import { connectDB } from './config/db.js'
import app from './app.js'

async function start() {
  await connectDB()
  app.listen(env.PORT, () => {
    console.log(`FixMate API listening on port ${env.PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err.message)
  process.exit(1)
})
