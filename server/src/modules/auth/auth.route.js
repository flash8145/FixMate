import { Router } from 'express'
import { register, login, me, updateProfile } from './auth.controller.js'
import { validate } from '../../middleware/validate.js'
import { requireAuth } from '../../middleware/auth.js'
import { registerSchema, loginSchema } from './auth.validator.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.get('/me', requireAuth, me)
router.patch('/profile', requireAuth, updateProfile)

export default router

