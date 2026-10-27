import { z } from 'zod'

export const createReviewSchema = z.object({
  bookingId: z.string().min(1, 'bookingId is required'),
  rating: z.coerce.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  tags: z.array(z.string()).default([]),
  text: z.string().max(500, 'Review text cannot exceed 500 characters').default(''),
})
