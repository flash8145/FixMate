import { asyncHandler } from '../../utils/asyncHandler.js'
import { Category } from './category.model.js'

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 })
  res.status(200).json({ success: true, data: categories })
})
