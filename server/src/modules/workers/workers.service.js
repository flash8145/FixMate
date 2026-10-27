import mongoose from 'mongoose'
import { WorkerProfile } from './workerProfile.model.js'
import { User } from '../auth/user.model.js'
import { AppError } from '../../utils/AppError.js'
import { MAX_ALLOWED_RADIUS_M, DEFAULT_SEARCH_RADIUS_M, SEARCH_RESULT_LIMIT } from '../../config/constants.js'

export async function upsertProfile(userId, input) {
  const { lat, lng, serviceRadiusKm, avatarUrl, ...rest } = input

  if (avatarUrl !== undefined) {
    await User.findByIdAndUpdate(userId, { avatarUrl })
  }

  const profile = await WorkerProfile.findOneAndUpdate(
    { userId },
    {
      ...rest,
      userId,
      location: { type: 'Point', coordinates: [lng, lat] },
      serviceRadiusM: serviceRadiusKm * 1000,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  return profile
}

export async function setAvailability(userId, isAvailable) {
  const profile = await WorkerProfile.findOneAndUpdate(
    { userId },
    { isAvailable },
    { new: true },
  )
  if (!profile) {
    throw new AppError('PROFILE_NOT_FOUND', 'Create a worker profile before toggling availability', 404)
  }
  return profile
}

export async function getMyProfile(userId) {
  return WorkerProfile.findOne({ userId }).populate('userId', 'name email phone avatarUrl')
}

export async function searchWorkers({ lat, lng, categoryId, radius, minRating, page }) {
  const maxDistance = Math.min(radius ?? DEFAULT_SEARCH_RADIUS_M, MAX_ALLOWED_RADIUS_M)
  const categoryObjectId = new mongoose.Types.ObjectId(categoryId)
  const skip = (page - 1) * SEARCH_RESULT_LIMIT

  const pipeline = [
    {
      // $geoNear MUST be the first pipeline stage — see FIXMATE_PROJECT_SPEC.md §6.
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] }, // GeoJSON is [lng, lat]
        distanceField: 'distanceM',
        maxDistance,
        spherical: true,
        query: {
          'skills.categoryId': categoryObjectId,
          isAvailable: true,
          isVerified: true,
          ...(minRating != null ? { 'ratingAgg.avg': { $gte: minRating } } : {}),
        },
      },
    },
    // Each worker's coverage radius varies, so a second in-memory check is
    // required on top of the geoNear cap. This scan is small and intentional.
    { $match: { $expr: { $lte: ['$distanceM', '$serviceRadiusM'] } } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $addFields: {
        matchedSkill: {
          $first: {
            $filter: {
              input: '$skills',
              as: 'skill',
              cond: { $eq: ['$$skill.categoryId', categoryObjectId] },
            },
          },
        },
      },
    },
    {
      // Weighted ranking, not raw distance — a 4.9★ worker further away
      // should be able to outrank a lower-rated worker close by.
      $addFields: {
        score: {
          $add: [
            { $multiply: [0.5, { $divide: ['$ratingAgg.avg', 5] }] },
            { $multiply: [0.3, { $subtract: [1, { $divide: ['$distanceM', maxDistance] }] }] },
            { $multiply: [0.2, { $min: [{ $divide: ['$jobsCompleted', 100] }, 1] }] },
          ],
        },
      },
    },
    { $sort: { score: -1 } },
    { $skip: skip },
    { $limit: SEARCH_RESULT_LIMIT },
    {
      $project: {
        _id: 0,
        workerId: '$_id',
        name: '$user.name',
        avatar: '$user.avatarUrl',
        avatarUrl: '$user.avatarUrl',
        rating: '$ratingAgg.avg',
        distanceM: { $round: ['$distanceM', 0] },
        lat: { $arrayElemAt: ['$location.coordinates', 1] },
        lng: { $arrayElemAt: ['$location.coordinates', 0] },
        minRate: '$matchedSkill.baseRate',
      },
    },
  ]

  return WorkerProfile.aggregate(pipeline)
}

export async function getWorkerDetail(workerId) {
  // Phone is intentionally excluded — it's only revealed after a booking is
  // ACCEPTED (see FIXMATE_PROJECT_SPEC.md §4.3 / §8), never on the public profile.
  const profile = await WorkerProfile.findById(workerId)
    .populate('userId', 'name avatarUrl')
    .populate('skills.categoryId', 'name icon slug')
  if (!profile) {
    throw new AppError('WORKER_NOT_FOUND', 'Worker not found', 404)
  }
  return profile
}
