import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  email: z.string().trim().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['customer', 'worker']),
})

export const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    name: z.string().trim().optional(),
    email: z.string().trim().optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine(
    (data) => Boolean(data.identifier || data.phone || data.name || data.email),
    {
      message: 'Phone number, name, or email is required',
      path: ['identifier'],
    },
  )
