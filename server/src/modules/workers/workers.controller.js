import { asyncHandler } from '../../utils/asyncHandler.js'
import * as workersService from './workers.service.js'

export const upsertProfile = asyncHandler(async (req, res) => {
  const profile = await workersService.upsertProfile(req.user._id, req.body)
  res.status(200).json({ success: true, data: profile })
})

export const setAvailability = asyncHandler(async (req, res) => {
  const profile = await workersService.setAvailability(req.user._id, req.body.isAvailable)
  res.status(200).json({ success: true, data: profile })
})

export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await workersService.getMyProfile(req.user._id)
  res.status(200).json({ success: true, data: profile })
})

export const search = asyncHandler(async (req, res) => {
  const results = await workersService.searchWorkers(req.query)
  res.status(200).json({ success: true, data: results })
})

export const getById = asyncHandler(async (req, res) => {
  const profile = await workersService.getWorkerDetail(req.params.id)
  res.status(200).json({ success: true, data: profile })
})
