import { Router } from 'express'
import { upsertProfile, setAvailability, getMyProfile, search, getById } from './workers.controller.js'
import { requireAuth } from '../../middleware/auth.js'
import { rbac } from '../../middleware/rbac.js'
import { validate, validateQuery } from '../../middleware/validate.js'
import { profileSchema, availabilitySchema, searchSchema } from './workers.validator.js'

const router = Router()

router.get('/search', validateQuery(searchSchema), search)
router.post('/profile', requireAuth, rbac('worker'), validate(profileSchema), upsertProfile)
router.get('/profile/me', requireAuth, rbac('worker'), getMyProfile)
router.patch('/availability', requireAuth, rbac('worker'), validate(availabilitySchema), setAvailability)
router.get('/:id', getById)

export default router
