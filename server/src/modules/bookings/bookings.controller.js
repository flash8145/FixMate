import { asyncHandler } from '../../utils/asyncHandler.js'
import * as bookingsService from './bookings.service.js'

export const getEstimate = asyncHandler(async (req, res) => {
  const result = await bookingsService.getEstimate(req.body)
  res.json({ success: true, data: result })
})

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingsService.createBooking(req.user._id, req.body)
  res.status(201).json({ success: true, data: booking })
})

export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.getMyBookings(req.user)
  res.json({ success: true, data: bookings })
})

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingsService.getBookingById(req.params.id, req.user)
  res.json({ success: true, data: booking })
})

export const updateStatus = asyncHandler(async (req, res) => {
  const booking = await bookingsService.updateBookingStatus(
    req.params.id,
    req.body.status,
    req.user,
  )
  res.json({ success: true, data: booking })
})

export const setFinalPrice = asyncHandler(async (req, res) => {
  const booking = await bookingsService.setFinalPrice(
    req.params.id,
    req.body.amount,
    req.user,
  )
  res.json({ success: true, data: booking })
})

export const confirmFinalPrice = asyncHandler(async (req, res) => {
  const booking = await bookingsService.confirmFinalPrice(req.params.id, req.user)
  res.json({ success: true, data: booking })
})
