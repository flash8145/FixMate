import { PricingConfig } from './pricingConfig.model.js'

const DEFAULT_CONFIG = {
  perKmRate: 15,
  freeDistanceM: 1000,
  urgencyFee: 100,
  nightMultiplier: 1.25,
  nightStartHour: 21,
  nightEndHour: 6,
  estimateSpreadPct: 0.15,
  deviationThresholdPct: 0.2,
}

export async function getPricingConfig() {
  let config = await PricingConfig.findOne().lean()
  if (!config) {
    config = await PricingConfig.create(DEFAULT_CONFIG)
  }
  return config
}

export async function updatePricingConfig(updateData) {
  let config = await PricingConfig.findOneAndUpdate({}, updateData, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  })
  return config
}
