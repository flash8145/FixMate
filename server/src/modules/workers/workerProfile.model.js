import mongoose from 'mongoose'

const workerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, default: '' },
    upiId: { type: String, trim: true, default: '' },
    experienceYrs: { type: Number, default: 0 },
    skills: [
      {
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
        baseRate: { type: Number, required: true },
        rateUnit: { type: String, enum: ['PER_VISIT', 'PER_HOUR'], required: true },
      },
    ],
    visitCharge: { type: Number, default: 0 },
    perKmRate: { type: Number, default: 0 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    address: {
      line: String,
      area: String,
      city: String,
      pincode: String,
    },
    serviceRadiusM: { type: Number, default: 5000 },
    isAvailable: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    ratingAgg: {
      sum: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      avg: { type: Number, default: 0 },
    },
    jobsCompleted: { type: Number, default: 0 },
    photos: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

workerProfileSchema.index({ location: '2dsphere' })
workerProfileSchema.index({ 'skills.categoryId': 1, isAvailable: 1 })
workerProfileSchema.index({ 'address.city': 1, 'ratingAgg.avg': -1 })

export const WorkerProfile = mongoose.model('WorkerProfile', workerProfileSchema)
