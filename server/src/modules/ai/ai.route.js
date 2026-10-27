import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import * as aiController from './ai.controller.js'

const router = Router()

// Protected route: allows logged-in customers, workers, or admins to use the assistant
router.post('/chat', requireAuth, aiController.chatWithAssistant)

export default router
