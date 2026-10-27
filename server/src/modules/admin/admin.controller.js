import { asyncHandler } from '../../utils/asyncHandler.js'
import * as adminService from './admin.service.js'

export const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats()
  res.json({ success: true, data: stats })
})

export const getPendingWorkers = asyncHandler(async (req, res) => {
  const workers = await adminService.getPendingWorkers()
  res.json({ success: true, data: workers })
})

export const verifyWorker = asyncHandler(async (req, res) => {
  const { isVerified = true } = req.body
  const worker = await adminService.verifyWorker(req.params.id, isVerified)
  res.json({ success: true, data: worker })
})

export const getPricingConfig = asyncHandler(async (req, res) => {
  const config = await adminService.getPricingConfig()
  res.json({ success: true, data: config })
})

export const updatePricingConfig = asyncHandler(async (req, res) => {
  const config = await adminService.updatePricingConfig(req.body)
  res.json({ success: true, data: config })
})

export const getAllWorkers = asyncHandler(async (req, res) => {
  const workers = await adminService.getAllWorkers()
  res.json({ success: true, data: workers })
})

export const createWorker = asyncHandler(async (req, res) => {
  const worker = await adminService.createWorker(req.body)
  res.status(201).json({ success: true, data: worker })
})

export const updateWorker = asyncHandler(async (req, res) => {
  const worker = await adminService.updateWorker(req.params.id, req.body)
  res.json({ success: true, data: worker })
})

export const deleteWorker = asyncHandler(async (req, res) => {
  const result = await adminService.deleteWorker(req.params.id)
  res.json({ success: true, data: result })
})

export const getAllCustomers = asyncHandler(async (req, res) => {
  const customers = await adminService.getAllCustomers()
  res.json({ success: true, data: customers })
})

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await adminService.createCustomer(req.body)
  res.status(201).json({ success: true, data: customer })
})

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await adminService.updateCustomer(req.params.id, req.body)
  res.json({ success: true, data: customer })
})

export const verifyCustomer = asyncHandler(async (req, res) => {
  const { isVerified = true } = req.body
  const customer = await adminService.verifyCustomer(req.params.id, isVerified)
  res.json({ success: true, data: customer })
})

export const deleteCustomer = asyncHandler(async (req, res) => {
  const result = await adminService.deleteCustomer(req.params.id)
  res.json({ success: true, data: result })
})

export const createCategory = asyncHandler(async (req, res) => {
  const category = await adminService.createCategory(req.body)
  res.status(201).json({ success: true, data: category })
})

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await adminService.updateCategory(req.params.id, req.body)
  res.json({ success: true, data: category })
})

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await adminService.deleteCategory(req.params.id)
  res.json({ success: true, data: result })
})

