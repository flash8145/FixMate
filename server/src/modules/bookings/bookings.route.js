import { Router } from 'express'
import * as bookingsController from './bookings.controller.js'
import { requireAuth } from '../../middleware/auth.js'
import { rbac } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import {
  estimateSchema,
  createBookingSchema,
  updateStatusSchema,
  setFinalPriceSchema,
} from './bookings.validator.js'

const router = Router()

router.post('/estimate', validate(estimateSchema), bookingsController.getEstimate)
router.post(
  '/',
  requireAuth,
  rbac('customer'),
  validate(createBookingSchema),
  bookingsController.createBooking,
)
router.get('/my', requireAuth, bookingsController.getMyBookings)
router.get('/:id', requireAuth, bookingsController.getBookingById)
router.patch(
  '/:id/status',
  requireAuth,
  validate(updateStatusSchema),
  bookingsController.updateStatus,
)
router.patch(
  '/:id/final-price',
  requireAuth,
  rbac('worker'),
  validate(setFinalPriceSchema),
  bookingsController.setFinalPrice,
)
router.patch(
  '/:id/confirm',
  requireAuth,
  rbac('customer'),
  bookingsController.confirmFinalPrice,
)

export default router
