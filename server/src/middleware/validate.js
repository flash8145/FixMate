import { AppError } from '../utils/AppError.js'

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(', ')
      throw new AppError('VALIDATION_ERROR', message, 400)
    }
    req.body = result.data
    next()
  }
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(', ')
      throw new AppError('VALIDATION_ERROR', message, 400)
    }
    req.query = result.data
    next()
  }
}
