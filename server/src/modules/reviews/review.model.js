import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // DB-level constraint: exactly one review per booking
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkerProfile',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    tags: {
      type: [String],
      default: [],
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

reviewSchema.index({ workerId: 1, createdAt: -1 })

export const Review = mongoose.model('Review', reviewSchema)
