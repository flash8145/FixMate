import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'worker', 'admin'], required: true },
    avatarUrl: { type: String, default: '' },
    address: {
      line: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      pincode: { type: String, default: '' },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [73.8567, 18.5204] }, // [lng, lat]
      },
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const User = mongoose.model('User', userSchema)
