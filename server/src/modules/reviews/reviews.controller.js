import { asyncHandler } from '../../utils/asyncHandler.js'
import * as reviewsService from './reviews.service.js'

export const createReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.createReview(req.user._id, req.body)
  res.status(201).json({ success: true, data: review })
})

export const getWorkerReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewsService.getWorkerReviews(req.params.id)
  res.json({ success: true, data: reviews })
})

export const getReviewByBooking = asyncHandler(async (req, res) => {
  const review = await reviewsService.getReviewByBooking(req.params.bookingId)
  res.json({ success: true, data: review })
})
