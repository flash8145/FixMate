import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  NVIDIA_API_KEY: z.string().optional().default(''),
  NVIDIA_BASE_URL: z.string().optional().default('https://integrate.api.nvidia.com/v1'),
  NVIDIA_MODEL: z.string().optional().default('nvidia/nemotron-3.5-lightning-30b-a3b'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
