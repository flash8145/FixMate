import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkerProfile',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    problemText: {
      type: String,
      required: true,
      trim: true,
    },
    photos: {
      type: [String],
      default: [],
    },
    address: {
      line: { type: String, default: '' },
      city: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
      },
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    urgency: {
      type: String,
      enum: ['NORMAL', 'IMMEDIATE'],
      default: 'NORMAL',
    },
    estimate: {
      breakdown: {
        visitCharge: Number,
        serviceBase: Number,
        travelCharge: Number,
        urgencyFee: Number,
        nightMultiplier: Number,
        isNight: Boolean,
        subtotal: Number,
        total: Number,
      },
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    final: {
      amount: { type: Number },
      setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      confirmedAt: { type: Date },
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'PRICE_SET', 'COMPLETED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    timeline: [
      {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true },
)

bookingSchema.index({ workerId: 1, status: 1, createdAt: -1 })
bookingSchema.index({ customerId: 1, createdAt: -1 })

export const Booking = mongoose.model('Booking', bookingSchema)
