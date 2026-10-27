import { connectDB } from '../config/db.js'
import { WorkerProfile } from '../modules/workers/workerProfile.model.js'
import mongoose from 'mongoose'

async function run() {
  await connectDB()
  const result = await WorkerProfile.updateMany({}, { isVerified: true })
  console.log(`Verified ${result.modifiedCount} worker profile(s)`)
  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
