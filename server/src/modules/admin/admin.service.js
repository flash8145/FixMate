import bcrypt from 'bcryptjs'
import { User } from '../auth/user.model.js'
import { WorkerProfile } from '../workers/workerProfile.model.js'
import { Booking } from '../bookings/booking.model.js'
import { Category } from '../categories/category.model.js'
import { getPricingConfig, updatePricingConfig } from '../pricing/config.service.js'
import { AppError } from '../../utils/AppError.js'
import { BCRYPT_COST } from '../../config/constants.js'

export async function getStats() {
  const [
    totalUsers,
    totalWorkers,
    activeWorkers,
    totalBookings,
    completedBookings,
    categoriesCount,
    pendingWorkers,
    pendingCustomers,
  ] = await Promise.all([
    User.countDocuments(),
    WorkerProfile.countDocuments(),
    WorkerProfile.countDocuments({ isAvailable: true, isVerified: true }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'COMPLETED' }),
    Category.countDocuments(),
    WorkerProfile.countDocuments({ isVerified: false }),
    User.countDocuments({ role: 'customer', isVerified: false }),
  ])

  return {
    totalUsers,
    totalWorkers,
    activeWorkers,
    totalBookings,
    completedBookings,
    categoriesCount,
    pendingWorkers,
    pendingCustomers,
  }
}

export async function getPendingWorkers() {
  return WorkerProfile.find({ isVerified: false })
    .populate('userId', 'name phone email avatarUrl isActive')
    .populate('skills.categoryId', 'name icon')
    .sort({ createdAt: -1 })
    .lean()
}

export async function getAllWorkers() {
  return WorkerProfile.find()
    .populate('userId', 'name phone email avatarUrl isActive')
    .populate('skills.categoryId', 'name icon')
    .sort({ createdAt: -1 })
    .lean()
}

export async function createWorker({
  name,
  phone,
  email,
  password,
  skills,
  visitCharge,
  perKmRate,
  experienceYrs,
  bio,
  address,
  isVerified,
  isAvailable,
}) {
  const cleanPhone = (phone || '').trim().replace(/\D/g, '')
  if (cleanPhone.length !== 10) {
    throw new AppError('INVALID_PHONE', 'Phone number must be 10 digits', 400)
  }
  const existingPhone = await User.findOne({ phone: cleanPhone })
  if (existingPhone) {
    throw new AppError('PHONE_EXISTS', 'This phone number is already registered', 409)
  }

  const passwordHash = await bcrypt.hash(password || 'Worker@123', BCRYPT_COST)
  const user = await User.create({
    name: (name || 'New Worker').trim(),
    phone: cleanPhone,
    email: email ? email.trim().toLowerCase() : undefined,
    passwordHash,
    role: 'worker',
    address: {
      line: address?.line || '',
      area: address?.area || '',
      city: address?.city || 'Pune',
      pincode: address?.pincode || '',
      location: {
        type: 'Point',
        coordinates: [
          Number(address?.lng ?? address?.location?.coordinates?.[0] ?? 73.8567),
          Number(address?.lat ?? address?.location?.coordinates?.[1] ?? 18.5204),
        ],
      },
    },
    isActive: true,
  })

  const coordinates = [
    Number(address?.lng ?? address?.location?.coordinates?.[0] ?? 73.8567),
    Number(address?.lat ?? address?.location?.coordinates?.[1] ?? 18.5204),
  ]

  const profile = await WorkerProfile.create({
    userId: user._id,
    bio: bio || '',
    experienceYrs: Number(experienceYrs) || 0,
    skills: Array.isArray(skills) && skills.length > 0 ? skills : [],
    visitCharge: Number(visitCharge) || 0,
    perKmRate: Number(perKmRate) || 15,
    location: { type: 'Point', coordinates },
    address: {
      line: address?.line || '',
      area: address?.area || '',
      city: address?.city || 'Pune',
      pincode: address?.pincode || '',
    },
    serviceRadiusM: 15000,
    isAvailable: isAvailable !== undefined ? isAvailable : true,
    isVerified: isVerified !== undefined ? isVerified : true,
  })

  return WorkerProfile.findById(profile._id)
    .populate('userId', 'name phone email avatarUrl isActive')
    .populate('skills.categoryId', 'name icon')
}

export async function verifyWorker(workerId, isVerified) {
  const worker = await WorkerProfile.findByIdAndUpdate(
    workerId,
    { isVerified },
    { new: true },
  ).populate('userId', 'name phone email')

  if (!worker) {
    throw new AppError('WORKER_NOT_FOUND', 'Worker profile not found', 404)
  }

  return worker
}

export async function updateWorker(workerId, data) {
  const worker = await WorkerProfile.findById(workerId)
  if (!worker) {
    throw new AppError('WORKER_NOT_FOUND', 'Worker profile not found', 404)
  }

  if (data.isVerified !== undefined) worker.isVerified = data.isVerified
  if (data.isAvailable !== undefined) worker.isAvailable = data.isAvailable
  if (data.visitCharge !== undefined) worker.visitCharge = Number(data.visitCharge)
  if (data.perKmRate !== undefined) worker.perKmRate = Number(data.perKmRate)
  if (data.experienceYrs !== undefined) worker.experienceYrs = Number(data.experienceYrs)
  if (data.bio !== undefined) worker.bio = data.bio
  if (data.skills !== undefined) worker.skills = data.skills
  if (data.photos !== undefined) worker.photos = data.photos

  if (data.address) {
    worker.address = {
      line: data.address.line !== undefined ? data.address.line : worker.address?.line,
      area: data.address.area !== undefined ? data.address.area : worker.address?.area,
      city: data.address.city || worker.address?.city || 'Pune',
      pincode: data.address.pincode !== undefined ? data.address.pincode : worker.address?.pincode,
    }
    if (data.address.lat && data.address.lng) {
      worker.location = {
        type: 'Point',
        coordinates: [Number(data.address.lng), Number(data.address.lat)],
      }
    }
  }

  if (worker.userId) {
    const userUpdates = {}
    if (data.isActive !== undefined) userUpdates.isActive = data.isActive
    if (data.name) userUpdates.name = data.name.trim()
    if (data.email !== undefined) userUpdates.email = data.email ? data.email.trim().toLowerCase() : ''
    if (data.phone) {
      const cleanPhone = data.phone.trim().replace(/\D/g, '')
      if (cleanPhone.length === 10) {
        const existing = await User.findOne({ phone: cleanPhone, _id: { $ne: worker.userId } })
        if (existing) throw new AppError('PHONE_EXISTS', 'Phone already in use', 409)
        userUpdates.phone = cleanPhone
      }
    }
    if (data.avatarUrl !== undefined) userUpdates.avatarUrl = data.avatarUrl
    if (data.password) {
      userUpdates.passwordHash = await bcrypt.hash(data.password, BCRYPT_COST)
    }
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(worker.userId, userUpdates)
    }
  }

  await worker.save()
  return WorkerProfile.findById(workerId)
    .populate('userId', 'name phone email avatarUrl isActive')
    .populate('skills.categoryId', 'name icon')
}

export async function deleteWorker(workerId) {
  const worker = await WorkerProfile.findById(workerId)
  if (!worker) {
    throw new AppError('WORKER_NOT_FOUND', 'Worker profile not found', 404)
  }

  const userId = worker.userId
  await WorkerProfile.findByIdAndDelete(workerId)
  if (userId) {
    await User.findByIdAndDelete(userId)
  }
  return { message: 'Worker and associated user deleted successfully' }
}

export async function getAllCustomers() {
  const customers = await User.find({ role: 'customer' })
    .sort({ createdAt: -1 })
    .lean()

  const customerIds = customers.map((c) => c._id)
  const bookingCounts = await Booking.aggregate([
    { $match: { customerId: { $in: customerIds } } },
    { $group: { _id: '$customerId', totalBookings: { $sum: 1 } } },
  ])

  const countMap = {}
  bookingCounts.forEach((b) => {
    countMap[b._id.toString()] = b.totalBookings
  })

  return customers.map((c) => ({
    ...c,
    totalBookings: countMap[c._id.toString()] || 0,
  }))
}

export async function createCustomer({ name, phone, email, password, address }) {
  const cleanPhone = (phone || '').trim().replace(/\D/g, '')
  if (cleanPhone.length !== 10) {
    throw new AppError('INVALID_PHONE', 'Phone number must be 10 digits', 400)
  }
  const existingPhone = await User.findOne({ phone: cleanPhone })
  if (existingPhone) {
    throw new AppError('PHONE_EXISTS', 'This phone number is already registered', 409)
  }

  const passwordHash = await bcrypt.hash(password || 'Customer@123', BCRYPT_COST)
  const user = await User.create({
    name: (name || 'New Customer').trim(),
    phone: cleanPhone,
    email: email ? email.trim().toLowerCase() : undefined,
    passwordHash,
    role: 'customer',
    address: {
      line: address?.line || '',
      area: address?.area || '',
      city: address?.city || 'Pune',
      pincode: address?.pincode || '',
      location: {
        type: 'Point',
        coordinates: [
          Number(address?.lng ?? address?.location?.coordinates?.[0] ?? 73.8567),
          Number(address?.lat ?? address?.location?.coordinates?.[1] ?? 18.5204),
        ],
      },
    },
    isActive: true,
    isVerified: true,
  })

  return user
}

export async function verifyCustomer(customerId, isVerified) {
  const customer = await User.findOneAndUpdate(
    { _id: customerId, role: 'customer' },
    { isVerified },
    { new: true },
  )

  if (!customer) {
    throw new AppError('CUSTOMER_NOT_FOUND', 'Customer account not found', 404)
  }

  return customer
}

export async function updateCustomer(userId, data) {
  const user = await User.findOne({ _id: userId, role: 'customer' })
  if (!user) {
    throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found', 404)
  }

  if (data.isVerified !== undefined) user.isVerified = data.isVerified
  if (data.isActive !== undefined) user.isActive = data.isActive
  if (data.name) user.name = data.name.trim()
  if (data.email !== undefined) user.email = data.email ? data.email.trim().toLowerCase() : ''
  if (data.phone) {
    const cleanPhone = data.phone.trim().replace(/\D/g, '')
    if (cleanPhone.length === 10) {
      const existing = await User.findOne({ phone: cleanPhone, _id: { $ne: userId } })
      if (existing) throw new AppError('PHONE_EXISTS', 'Phone already in use', 409)
      user.phone = cleanPhone
    }
  }
  if (data.address) {
    user.address = {
      line: data.address.line !== undefined ? data.address.line : user.address?.line,
      area: data.address.area !== undefined ? data.address.area : user.address?.area,
      city: data.address.city || user.address?.city || 'Pune',
      pincode: data.address.pincode !== undefined ? data.address.pincode : user.address?.pincode,
      location: user.address?.location || { type: 'Point', coordinates: [73.8567, 18.5204] },
    }
  }
  if (data.password) {
    user.passwordHash = await bcrypt.hash(data.password, BCRYPT_COST)
  }

  await user.save()
  return user
}

export async function deleteCustomer(userId) {
  const user = await User.findOne({ _id: userId, role: 'customer' })
  if (!user) {
    throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found', 404)
  }

  await User.findByIdAndDelete(userId)
  return { message: 'Customer deleted successfully' }
}

export async function createCategory({ name, slug, icon, isActive }) {
  const cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  const existing = await Category.findOne({ slug: cleanSlug })
  if (existing) {
    throw new AppError('CATEGORY_EXISTS', 'A category with this name or slug already exists', 409)
  }

  const category = await Category.create({
    name: name.trim(),
    slug: cleanSlug,
    icon: icon || '🛠️',
    isActive: isActive !== undefined ? isActive : true,
  })
  return category
}

export async function updateCategory(id, data) {
  const category = await Category.findById(id)
  if (!category) {
    throw new AppError('CATEGORY_NOT_FOUND', 'Category not found', 404)
  }

  if (data.name) category.name = data.name.trim()
  if (data.icon) category.icon = data.icon.trim()
  if (data.isActive !== undefined) category.isActive = data.isActive
  if (data.slug) {
    category.slug = data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  }

  await category.save()
  return category
}

export async function deleteCategory(id) {
  const category = await Category.findById(id)
  if (!category) {
    throw new AppError('CATEGORY_NOT_FOUND', 'Category not found', 404)
  }
  await Category.findByIdAndDelete(id)
  return { message: 'Category deleted successfully' }
}

export { getPricingConfig, updatePricingConfig }
