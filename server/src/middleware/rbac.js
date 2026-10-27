import { AppError } from '../utils/AppError.js'

export function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new AppError('FORBIDDEN', 'You do not have access to this resource', 403)
    }
    next()
  }
}
