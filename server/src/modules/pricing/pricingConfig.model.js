import mongoose from 'mongoose'

const pricingConfigSchema = new mongoose.Schema(
  {
    perKmRate: { type: Number, required: true, default: 15 }, // ₹ per km
    freeDistanceM: { type: Number, required: true, default: 1000 }, // meters free before distance charges apply
    urgencyFee: { type: Number, required: true, default: 100 }, // ₹ extra for IMMEDIATE urgency
    nightMultiplier: { type: Number, required: true, default: 1.25 }, // multiplier for night hours (e.g. 1.25 = +25%)
    nightStartHour: { type: Number, required: true, default: 21 }, // 21:00 (9 PM)
    nightEndHour: { type: Number, required: true, default: 6 }, // 06:00 (6 AM)
    estimateSpreadPct: { type: Number, required: true, default: 0.15 }, // ±15% range around estimated total
    deviationThresholdPct: { type: Number, required: true, default: 0.2 }, // 20% deviation threshold for price warnings
  },
  { timestamps: true },
)

export const PricingConfig = mongoose.model('PricingConfig', pricingConfigSchema)
