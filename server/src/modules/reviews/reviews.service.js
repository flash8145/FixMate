import { Review } from './review.model.js'
import { Booking } from '../bookings/booking.model.js'
import { WorkerProfile } from '../workers/workerProfile.model.js'
import { AppError } from '../../utils/AppError.js'

export async function createReview(customerId, { bookingId, rating, tags, text }) {
  const booking = await Booking.findById(bookingId)
  if (!booking) {
    throw new AppError('BOOKING_NOT_FOUND', 'Booking not found', 404)
  }

  if (booking.customerId.toString() !== customerId.toString()) {
    throw new AppError('FORBIDDEN', 'You can only review bookings you have created', 403)
  }

  // Spec §8: Review creation is permitted ONLY when status is COMPLETED
  if (booking.status !== 'COMPLETED') {
    throw new AppError(
      'BOOKING_NOT_COMPLETED',
      'You can only submit a review after the booking has been marked COMPLETED',
      400,
    )
  }

  const existingReview = await Review.findOne({ bookingId })
  if (existingReview) {
    throw new AppError('ALREADY_REVIEWED', 'You have already reviewed this booking', 400)
  }

  const review = await Review.create({
    bookingId,
    workerId: booking.workerId,
    customerId,
    rating,
    tags: tags || [],
    text: text || '',
  })

  // Atomic update to workerProfile.ratingAgg (sum, count, avg)
  const workerProfile = await WorkerProfile.findByIdAndUpdate(
    booking.workerId,
    {
      $inc: {
        'ratingAgg.sum': rating,
        'ratingAgg.count': 1,
      },
    },
    { new: true },
  )

  if (workerProfile && workerProfile.ratingAgg.count > 0) {
    const avg = Math.round((workerProfile.ratingAgg.sum / workerProfile.ratingAgg.count) * 10) / 10
    await WorkerProfile.findByIdAndUpdate(booking.workerId, {
      $set: { 'ratingAgg.avg': avg },
    })
  }

  return review
}

export async function getWorkerReviews(workerId, limit = 20) {
  return Review.find({ workerId })
    .populate('customerId', 'name avatarUrl')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
}

export async function getReviewByBooking(bookingId) {
  return Review.findOne({ bookingId }).lean()
}
