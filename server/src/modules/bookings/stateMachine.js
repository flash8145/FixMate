import { AppError } from '../../utils/AppError.js'

/**
 * Allowed transitions mapping:
 * key: current status
 * value: array of allowed target statuses and permitted actor roles
 */
const TRANSITION_RULES = {
  PENDING: {
    ACCEPTED: ['worker'],
    REJECTED: ['worker'],
    CANCELLED: ['customer', 'admin'],
  },
  ACCEPTED: {
    IN_PROGRESS: ['worker'],
    CANCELLED: ['customer', 'worker', 'admin'],
  },
  IN_PROGRESS: {
    PRICE_SET: ['worker'],
    CANCELLED: ['customer', 'worker', 'admin'],
  },
  PRICE_SET: {
    COMPLETED: ['customer'],
    CANCELLED: ['customer', 'admin'],
  },
  COMPLETED: {},
  REJECTED: {},
  CANCELLED: {},
}

/**
 * Validates and executes a status transition on a booking instance.
 * As per spec §8, this is the single authority for status transitions.
 *
 * @param {Object} booking - Mongoose Booking document
 * @param {string} nextStatus - Destination status
 * @param {Object} actor - The user performing the action { _id, role }
 * @param {string} [workerUserId] - The User _id belonging to the booking's workerProfile
 * @returns {Object} The updated booking document
 */
export function transition(booking, nextStatus, actor, workerUserId = null) {
  const currentStatus = booking.status
  const allowedNext = TRANSITION_RULES[currentStatus]

  if (!allowedNext || !allowedNext[nextStatus]) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition booking from ${currentStatus} to ${nextStatus}`,
      400,
    )
  }

  const allowedRoles = allowedNext[nextStatus]

  // Verify actor ownership and role
  const isCustomer = actor._id.toString() === booking.customerId.toString()
  const isWorker =
    actor.role === 'worker' &&
    workerUserId &&
    actor._id.toString() === workerUserId.toString()
  const isAdmin = actor.role === 'admin'

  let authorized = false
  if (isAdmin) {
    authorized = true
  } else if (allowedRoles.includes('customer') && isCustomer) {
    authorized = true
  } else if (allowedRoles.includes('worker') && isWorker) {
    authorized = true
  }

  if (!authorized) {
    throw new AppError(
      'FORBIDDEN_TRANSITION',
      `You are not authorized to move this booking to ${nextStatus}`,
      403,
    )
  }

  booking.status = nextStatus
  booking.timeline.push({
    status: nextStatus,
    at: new Date(),
    by: actor._id,
  })

  return booking
}
