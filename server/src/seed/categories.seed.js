import { connectDB } from '../config/db.js'
import { Category } from '../modules/categories/category.model.js'
import mongoose from 'mongoose'

const categories = [
  { slug: 'plumber', name: 'Plumber', icon: '🔧' },
  { slug: 'electrician', name: 'Electrician', icon: '💡' },
  { slug: 'carpenter', name: 'Carpenter', icon: '🪚' },
  { slug: 'ac-technician', name: 'AC Technician', icon: '❄️' },
  { slug: 'painter', name: 'Painter', icon: '🎨' },
]

async function seed() {
  await connectDB()

  for (const cat of categories) {
    await Category.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true, new: true })
  }

  console.log(`Seeded ${categories.length} categories`)
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
