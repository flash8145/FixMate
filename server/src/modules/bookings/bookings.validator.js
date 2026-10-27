import { z } from 'zod'

export const estimateSchema = z.object({
  workerId: z.string().min(1, 'workerId is required'),
  categoryId: z.string().min(1, 'categoryId is required'),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  scheduledAt: z.string().datetime().or(z.string().min(1)).optional(),
  urgency: z.enum(['NORMAL', 'IMMEDIATE']).default('NORMAL'),
})

export const createBookingSchema = z.object({
  workerId: z.string().min(1, 'workerId is required'),
  categoryId: z.string().min(1, 'categoryId is required'),
  problemText: z.string().min(5, 'Problem description must be at least 5 characters'),
  photos: z.array(z.string()).default([]),
  address: z.object({
    line: z.string().trim().min(3, 'Address line/street is required'),
    city: z.string().trim().min(2, 'City is required'),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),
  scheduledAt: z.string().min(1, 'scheduledAt is required'),
  urgency: z.enum(['NORMAL', 'IMMEDIATE']).default('NORMAL'),
})

export const updateStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'CANCELLED']),
})

export const setFinalPriceSchema = z.object({
  amount: z.coerce.number().positive('Final price must be greater than zero'),
})
