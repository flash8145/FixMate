import { Router } from 'express'
import * as reviewsController from './reviews.controller.js'
import { requireAuth } from '../../middleware/auth.js'
import { rbac } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { createReviewSchema } from './reviews.validator.js'

const router = Router()

router.post(
  '/',
  requireAuth,
  rbac('customer'),
  validate(createReviewSchema),
  reviewsController.createReview,
)
router.get('/worker/:id', reviewsController.getWorkerReviews)
router.get('/booking/:bookingId', requireAuth, reviewsController.getReviewByBooking)

export default router
