import { AppError } from '../../utils/AppError.js'

/**
 * Pure function: calculates an upfront price estimate range based on worker rates,
 * distance, urgency, and time of day.
 *
 * NOTE: As per FIXMATE_PROJECT_SPEC.md §7, this function has zero database access
 * and must remain purely deterministic and unit-testable.
 *
 * @param {Object} params
 * @param {Object} params.worker - Worker profile object with visitCharge and skills array
 * @param {string} params.categoryId - Selected service category ID
 * @param {number} params.distanceM - Distance in meters between worker and customer
 * @param {Date|string} [params.scheduledAt] - Date/time of requested service
 * @param {string} [params.urgency='NORMAL'] - Urgency level: 'NORMAL' | 'IMMEDIATE'
 * @param {Object} params.config - Pricing configuration parameters
 * @returns {{ breakdown: Object, min: number, max: number }}
 */
export function calculateEstimate({
  worker,
  categoryId,
  distanceM = 0,
  scheduledAt,
  urgency = 'NORMAL',
  config,
}) {
  if (!worker || !Array.isArray(worker.skills)) {
    throw new AppError('INVALID_WORKER_DATA', 'Worker profile or skills missing', 400)
  }
  if (!config) {
    throw new AppError('CONFIG_MISSING', 'Pricing configuration is required', 500)
  }

  const skill = worker.skills.find((s) => {
    const sId = s.categoryId?._id ? s.categoryId._id.toString() : s.categoryId?.toString()
    return sId === categoryId.toString()
  })

  if (!skill) {
    throw new AppError('SKILL_NOT_FOUND', 'Worker does not list a rate for this category', 400)
  }

  const visitCharge = Number(worker.visitCharge) || 0
  const serviceBase = Number(skill.baseRate) || 0

  // Travel charge: perKmRate (worker override or platform default) * distance beyond freeDistanceM
  const effectivePerKmRate = Number(worker.perKmRate) > 0 ? Number(worker.perKmRate) : (config.perKmRate || 0)
  const billableDistanceM = Math.max(0, (distanceM || 0) - (config.freeDistanceM || 0))
  const travelCharge = Math.round((billableDistanceM / 1000) * effectivePerKmRate)

  // Urgency fee: flat extra charge if customer requested IMMEDIATE service
  const urgencyFee = urgency === 'IMMEDIATE' ? (config.urgencyFee || 0) : 0

  // Night multiplier: applied if service time falls in night hours
  const dateObj = scheduledAt ? new Date(scheduledAt) : new Date()
  const hour = dateObj.getHours()
  const nightStart = config.nightStartHour ?? 21
  const nightEnd = config.nightEndHour ?? 6
  const isNight = hour >= nightStart || hour < nightEnd
  const nightMultiplier = isNight ? (config.nightMultiplier ?? 1.25) : 1.0

  const subtotal = visitCharge + serviceBase + travelCharge + urgencyFee
  const total = Math.round(subtotal * nightMultiplier)

  const spread = config.estimateSpreadPct ?? 0.15
  const min = Math.max(0, Math.round(total * (1 - spread)))
  const max = Math.max(min, Math.round(total * (1 + spread)))

  return {
    breakdown: {
      visitCharge,
      serviceBase,
      perKmRate: effectivePerKmRate,
      travelCharge,
      urgencyFee,
      nightMultiplier,
      isNight,
      subtotal,
      total,
    },
    min,
    max,
  }
}
