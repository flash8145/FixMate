import { z } from 'zod'

export const profileSchema = z.object({
  bio: z.string().max(1000).optional(),
  experienceYrs: z.coerce.number().min(0).max(60),
  skills: z
    .array(
      z.object({
        categoryId: z.string().min(1, 'categoryId is required'),
        baseRate: z.coerce.number().min(0),
        rateUnit: z.enum(['PER_VISIT', 'PER_HOUR']),
      }),
    )
    .min(1, 'Add at least one skill'),
  visitCharge: z.coerce.number().min(0),
  perKmRate: z.coerce.number().min(0).optional().default(0),
  avatarUrl: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  address: z.object({
    line: z.string().optional(),
    area: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    pincode: z.string().optional(),
  }),
  serviceRadiusKm: z.coerce.number().min(0.5).max(50),
  photos: z.array(z.string()).optional(),
})

export const availabilitySchema = z.object({
  isAvailable: z.boolean(),
})

export const searchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  categoryId: z.string().min(1, 'categoryId is required'),
  radius: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
})
