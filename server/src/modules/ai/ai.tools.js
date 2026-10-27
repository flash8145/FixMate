import mongoose from 'mongoose'
import { Category } from '../categories/category.model.js'
import * as workersService from '../workers/workers.service.js'
import * as bookingsService from '../bookings/bookings.service.js'
import { AppError } from '../../utils/AppError.js'

export const AI_TOOLS_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description: 'Returns all available service categories on FixMate (e.g., Painter, Plumber, Electrician, Carpenter, AC Technician).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_workers',
      description: 'Search for available and verified workers near the customer matching a service category.',
      parameters: {
        type: 'object',
        properties: {
          categoryName: {
            type: 'string',
            description: 'The service category name or slug (e.g. "painter", "plumber", "electrician").',
          },
          sortBy: {
            type: 'string',
            enum: ['best_rated', 'affordable', 'nearest'],
            description: 'Sorting priority. "best_rated" prioritizes highest rating, "affordable" prioritizes lowest visit/base price.',
          },
          radiusKm: {
            type: 'number',
            description: 'Search radius in kilometers (default 25 km).',
          },
        },
        required: ['categoryName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pricing_estimate',
      description: 'Calculate upfront transparent price estimate range (min, max, and breakdown) for a specific worker and appointment time.',
      parameters: {
        type: 'object',
        properties: {
          workerId: { type: 'string', description: 'The ID of the worker profile' },
          categoryId: { type: 'string', description: 'The category ID' },
          scheduledAt: { type: 'string', description: 'ISO date string of the desired appointment time' },
          urgency: { type: 'string', enum: ['NORMAL', 'IMMEDIATE'], description: 'Urgency level (default NORMAL)' },
        },
        required: ['workerId', 'categoryId', 'scheduledAt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Create an actual confirmed booking for the customer with the selected worker.',
      parameters: {
        type: 'object',
        properties: {
          workerId: { type: 'string', description: 'The ID of the worker profile' },
          categoryId: { type: 'string', description: 'The category ID' },
          problemText: { type: 'string', description: 'Detailed description of the task or repair issue' },
          scheduledAt: { type: 'string', description: 'ISO date string of appointment' },
          urgency: { type: 'string', enum: ['NORMAL', 'IMMEDIATE'], description: 'Urgency level' },
        },
        required: ['workerId', 'categoryId', 'problemText', 'scheduledAt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_bookings',
      description: 'Fetch the logged-in customer bookings and current status tracking.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

/**
 * Execute tool calls requested by the AI model
 */
export async function executeTool(name, args, context) {
  const { user, customerLocation } = context

  // Derive coordinates (prefer live location passed by frontend, fallback to user permanent address or Pune default)
  const userLat = customerLocation?.lat || user?.address?.location?.coordinates?.[1] || 18.5204
  const userLng = customerLocation?.lng || user?.address?.location?.coordinates?.[0] || 73.8567
  const addressLine = customerLocation?.line || user?.address?.line || 'Customer Location'
  const city = customerLocation?.city || user?.address?.city || 'Pune'

  switch (name) {
    case 'list_categories': {
      const categories = await Category.find({ isActive: true }).select('_id name slug icon')
      return { success: true, categories }
    }

    case 'search_workers': {
      const { categoryName, sortBy = 'best_rated', radiusKm = 25 } = args

      // Find matching category
      const cleanCat = (categoryName || '').trim().toLowerCase()
      const category = await Category.findOne({
        isActive: true,
        $or: [
          { slug: cleanCat },
          { name: new RegExp(`^${cleanCat}$`, 'i') },
          { slug: new RegExp(cleanCat, 'i') },
          { name: new RegExp(cleanCat, 'i') },
        ],
      })

      if (!category) {
        return {
          success: false,
          error: `Category "${categoryName}" was not found. Available categories include Plumber, Electrician, Carpenter, AC Technician, Painter.`,
        }
      }

      const rawWorkers = await workersService.searchWorkers({
        lat: userLat,
        lng: userLng,
        categoryId: category._id,
        radius: (radiusKm || 25) * 1000,
        page: 1,
      })

      if (!rawWorkers || rawWorkers.length === 0) {
        return {
          success: true,
          categoryId: category._id,
          categoryName: category.name,
          workers: [],
          message: `No active verified ${category.name}s found within ${radiusKm}km of your location.`,
        }
      }

      // Fetch additional profile details (visitCharge, bio, skills) for top results
      const enrichedWorkers = await Promise.all(
        rawWorkers.slice(0, 8).map(async (w) => {
          try {
            const detail = await workersService.getWorkerDetail(w.workerId)
            const matchedSkill = detail.skills.find(
              (s) => s.categoryId?._id?.toString() === category._id.toString() || s.categoryId?.toString() === category._id.toString(),
            )
            return {
              workerId: w.workerId,
              name: w.name,
              avatar: w.avatar || w.avatarUrl || '',
              rating: w.rating || 5.0,
              distanceKm: Number(((w.distanceM || 0) / 1000).toFixed(1)),
              baseRate: matchedSkill?.baseRate || w.minRate || 350,
              rateUnit: matchedSkill?.rateUnit || 'PER_VISIT',
              visitCharge: detail.visitCharge || 150,
              perKmRate: detail.perKmRate || 0,
              experienceYrs: detail.experienceYrs || 1,
              bio: detail.bio || '',
              lat: w.lat || detail.location?.coordinates?.[1] || null,
              lng: w.lng || detail.location?.coordinates?.[0] || null,
            }
          } catch {
            return {
              workerId: w.workerId,
              name: w.name,
              avatar: w.avatar || '',
              rating: w.rating || 5.0,
              distanceKm: Number(((w.distanceM || 0) / 1000).toFixed(1)),
              baseRate: w.minRate || 350,
              rateUnit: 'PER_VISIT',
              visitCharge: 150,
              lat: w.lat || null,
              lng: w.lng || null,
            }
          }
        }),
      )

      // Sort based on requested preference
      if (sortBy === 'affordable') {
        enrichedWorkers.sort((a, b) => (a.visitCharge + a.baseRate) - (b.visitCharge + b.baseRate))
      } else if (sortBy === 'nearest') {
        enrichedWorkers.sort((a, b) => a.distanceKm - b.distanceKm)
      } else {
        // 'best_rated' default (high rating, then affordable)
        enrichedWorkers.sort((a, b) => b.rating - a.rating || (a.visitCharge + a.baseRate) - (b.visitCharge + b.baseRate))
      }

      return {
        success: true,
        categoryId: category._id,
        categoryName: category.name,
        totalFound: enrichedWorkers.length,
        userLocation: { lat: userLat, lng: userLng, city },
        workers: enrichedWorkers,
      }
    }

    case 'get_pricing_estimate': {
      const { workerId, categoryId, scheduledAt, urgency = 'NORMAL' } = args
      try {
        const result = await bookingsService.getEstimate({
          workerId,
          categoryId,
          lat: userLat,
          lng: userLng,
          scheduledAt: new Date(scheduledAt),
          urgency,
        })

        let workerInfo = null
        try {
          const detail = await workersService.getWorkerDetail(workerId)
          workerInfo = {
            workerId,
            name: detail.userId?.name || 'Worker',
            avatar: detail.userId?.avatarUrl || '',
            rating: detail.ratingAgg?.avg || 5.0,
            lat: detail.location?.coordinates?.[1] || null,
            lng: detail.location?.coordinates?.[0] || null,
          }
        } catch {
          // ignore
        }

        return {
          success: true,
          estimate: result.estimate,
          distanceKm: Number((result.distanceM / 1000).toFixed(1)),
          worker: workerInfo,
        }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }

    case 'create_booking': {
      const { workerId, categoryId, problemText, scheduledAt, urgency = 'NORMAL' } = args

      try {
        const booking = await bookingsService.createBooking(user._id, {
          workerId,
          categoryId,
          problemText: problemText || 'Service requested via FixMate AI Concierge',
          address: {
            line: addressLine || 'Saved Customer Address',
            city: city || 'Pune',
            lat: userLat,
            lng: userLng,
          },
          scheduledAt: new Date(scheduledAt),
          urgency,
        })

        return {
          success: true,
          booking: {
            id: booking._id,
            code: booking.code,
            status: booking.status,
            scheduledAt: booking.scheduledAt,
            estimate: booking.estimate,
            problemText: booking.problemText,
          },
        }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }

    case 'get_my_bookings': {
      try {
        const bookings = await bookingsService.getMyBookings(user)
        return {
          success: true,
          bookings: (bookings || []).slice(0, 5).map((b) => ({
            id: b._id,
            code: b.code,
            status: b.status,
            service: b.categoryId?.name || 'Service',
            worker: b.workerId?.userId?.name || 'Assigned Worker',
            scheduledAt: b.scheduledAt,
            estimate: b.estimate,
            finalAmount: b.final?.amount,
          })),
        }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
