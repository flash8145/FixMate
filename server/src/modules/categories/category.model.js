import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
})

export const Category = mongoose.model('Category', categorySchema)
