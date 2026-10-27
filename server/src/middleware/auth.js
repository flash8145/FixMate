import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import { User } from '../modules/auth/user.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401)
  }

  let payload
  try {
    payload = jwt.verify(token, env.JWT_SECRET)
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401)
  }

  const user = await User.findById(payload.sub)
  if (!user || !user.isActive) {
    throw new AppError('UNAUTHORIZED', 'Account no longer active', 401)
  }

  req.user = user
  next()
})
