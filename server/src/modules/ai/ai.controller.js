import { asyncHandler } from '../../utils/asyncHandler.js'
import * as aiService from './ai.service.js'

export const chatWithAssistant = asyncHandler(async (req, res) => {
  const { message, conversationHistory, customerLocation } = req.body

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: { message: 'Message string is required' } })
  }

  const result = await aiService.runAiAssistant({
    user: req.user,
    message,
    conversationHistory: conversationHistory || [],
    customerLocation,
  })

  res.json({ success: true, data: result })
})
