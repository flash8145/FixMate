import { asyncHandler } from '../../utils/asyncHandler.js'
import * as authService from './auth.service.js'

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body)
  res.status(201).json({ success: true, data: result })
})

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body)
  res.status(200).json({ success: true, data: result })
})

export const me = asyncHandler(async (req, res) => {
  const data = authService.getMe(req.user)
  res.status(200).json({ success: true, data })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const data = await authService.updateUserProfile(req.user._id, req.body)
  res.status(200).json({ success: true, data })
})

