import { Booking } from './booking.model.js'
import { WorkerProfile } from '../workers/workerProfile.model.js'
import { getPricingConfig } from '../pricing/config.service.js'
import { calculateEstimate } from '../pricing/engine.js'
import { calculateDistanceM } from '../../utils/geo.js'
import { AppError } from '../../utils/AppError.js'
import { transition } from './stateMachine.js'

function generateBookingCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = 'FM-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Gating helper: removes phone numbers if booking status has not reached ACCEPTED.
 * Attaches convenient WhatsApp deep links if phone is revealed.
 */
function sanitizeBooking(doc, actorRole) {
  const b = doc.toObject ? doc.toObject() : { ...doc }
  const isAcceptedOrBeyond = ['ACCEPTED', 'IN_PROGRESS', 'PRICE_SET', 'COMPLETED'].includes(b.status)

  const workerUser = b.workerId?.userId
  const customer = b.customerId

  if (!isAcceptedOrBeyond) {
    if (workerUser && typeof workerUser === 'object') {
      delete workerUser.phone
    }
    if (customer && typeof customer === 'object') {
      delete customer.phone
    }
    delete b.workerPhone
    delete b.customerPhone
    delete b.whatsAppUrl
    delete b.workerUpiId
    delete b.upiUrl
  } else {
    const rawWorkerPhone = workerUser?.phone || b.workerPhone
    const rawCustomerPhone = customer?.phone || b.customerPhone

    if (rawWorkerPhone) {
      b.workerPhone = rawWorkerPhone
    }
    if (rawCustomerPhone) {
      b.customerPhone = rawCustomerPhone
    }

    // Attach UPI Payee ID & standard NPCI deep link
    // If worker upiId is blank, fallback to raw 10-digit mobile number without '@upi'
    const workerUpi =
      b.workerId?.upiId ||
      (rawWorkerPhone ? rawWorkerPhone.replace(/\D/g, '').slice(-10) : '')
    if (workerUpi) {
      b.workerUpiId = workerUpi
    }

    const payAmount = b.final?.amount || b.estimate?.min || 0
    if (workerUpi && payAmount > 0) {
      const payeeName = workerUser?.name || 'FixMate Partner'
      const note = `FixMate #${b.code} Payment`
      b.upiUrl = `upi://pay?pa=${encodeURIComponent(workerUpi)}&pn=${encodeURIComponent(
        payeeName,
      )}&am=${payAmount}&cu=INR&tn=${encodeURIComponent(note)}`
    }

    // Generate WhatsApp deep link for the requesting actor
    if (actorRole === 'customer' && rawWorkerPhone) {
      const cleanNum = rawWorkerPhone.replace(/\D/g, '')
      const fullNum = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum
      const text = encodeURIComponent(
        `Hello ${workerUser?.name || 'Partner'}, I am contacting you regarding FixMate booking #${b.code}.`,
      )
      b.whatsAppUrl = `https://wa.me/${fullNum}?text=${text}`
    } else if (actorRole === 'worker' && rawCustomerPhone) {
      const cleanNum = rawCustomerPhone.replace(/\D/g, '')
      const fullNum = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum
      const text = encodeURIComponent(
        `Hello ${customer?.name || 'Customer'}, I am your FixMate technician for booking #${b.code}.`,
      )
      b.whatsAppUrl = `https://wa.me/${fullNum}?text=${text}`
    }
  }

  return b
}

export async function getEstimate({ workerId, categoryId, lat, lng, scheduledAt, urgency }) {
  const worker = await WorkerProfile.findById(workerId)
  if (!worker) {
    throw new AppError('WORKER_NOT_FOUND', 'Worker profile not found', 404)
  }

  const workerCoords = worker.location.coordinates // [lng, lat]
  const distanceM = calculateDistanceM(workerCoords, [lng, lat], true)

  const config = await getPricingConfig()
  const estimate = calculateEstimate({
    worker,
    categoryId,
    distanceM,
    scheduledAt,
    urgency,
    config,
  })

  return { estimate, distanceM }
}

export async function createBooking(customerId, input) {
  const { workerId, categoryId, problemText, photos, address, scheduledAt, urgency } = input

  const worker = await WorkerProfile.findById(workerId)
  if (!worker) {
    throw new AppError('WORKER_NOT_FOUND', 'Worker not found', 404)
  }
  if (!worker.isAvailable) {
    throw new AppError('WORKER_UNAVAILABLE', 'Worker is currently not accepting new bookings', 400)
  }

  // Calculate distance between worker location and requested job location
  const distanceM = calculateDistanceM(
    worker.location.coordinates,
    [address.lng, address.lat],
    true,
  )

  if (distanceM > worker.serviceRadiusM) {
    throw new AppError(
      'OUT_OF_SERVICE_RADIUS',
      `This worker's service area is ${worker.serviceRadiusM / 1000} km, but the location is ${(distanceM / 1000).toFixed(1)} km away`,
      400,
    )
  }

  const config = await getPricingConfig()
  const { estimate } = await getEstimate({
    workerId,
    categoryId,
    lat: address.lat,
    lng: address.lng,
    scheduledAt,
    urgency,
  })

  // Generate unique human-readable booking code
  let code
  let codeUnique = false
  for (let i = 0; i < 5; i++) {
    code = generateBookingCode()
    const existing = await Booking.findOne({ code })
    if (!existing) {
      codeUnique = true
      break
    }
  }
  if (!codeUnique) {
    code = `FM-${Date.now().toString(36).toUpperCase()}`
  }

  const booking = await Booking.create({
    code,
    customerId,
    workerId,
    categoryId,
    problemText,
    photos: photos || [],
    address: {
      line: address.line,
      city: address.city,
      location: {
        type: 'Point',
        coordinates: [address.lng, address.lat],
      },
    },
    scheduledAt,
    urgency: urgency || 'NORMAL',
    estimate,
    status: 'PENDING',
    timeline: [
      {
        status: 'PENDING',
        at: new Date(),
        by: customerId,
      },
    ],
  })

  return booking
}

export async function getMyBookings(actor) {
  let query = {}

  if (actor.role === 'customer') {
    query = { customerId: actor._id }
  } else if (actor.role === 'worker') {
    const profile = await WorkerProfile.findOne({ userId: actor._id })
    if (!profile) return []
    query = { workerId: profile._id }
  } else if (actor.role !== 'admin') {
    return []
  }

  const bookings = await Booking.find(query)
    .populate('customerId', 'name phone email avatarUrl')
    .populate({
      path: 'workerId',
      populate: { path: 'userId', select: 'name phone email avatarUrl' },
    })
    .populate('categoryId', 'name slug icon')
    .sort({ createdAt: -1 })

  return bookings.map((b) => sanitizeBooking(b, actor.role))
}

export async function getBookingById(bookingId, actor) {
  const booking = await Booking.findById(bookingId)
    .populate('customerId', 'name phone email avatarUrl')
    .populate({
      path: 'workerId',
      populate: { path: 'userId', select: 'name phone email avatarUrl' },
    })
    .populate('categoryId', 'name slug icon')

  if (!booking) {
    throw new AppError('BOOKING_NOT_FOUND', 'Booking not found', 404)
  }

  const isCustomer = booking.customerId._id.toString() === actor._id.toString()
  const isWorker = booking.workerId?.userId?._id?.toString() === actor._id.toString()
  const isAdmin = actor.role === 'admin'

  if (!isCustomer && !isWorker && !isAdmin) {
    throw new AppError('FORBIDDEN', 'Access denied to this booking', 403)
  }

  return sanitizeBooking(booking, actor.role)
}

export async function updateBookingStatus(bookingId, nextStatus, actor) {
  const booking = await Booking.findById(bookingId).populate('workerId', 'userId')
  if (!booking) {
    throw new AppError('BOOKING_NOT_FOUND', 'Booking not found', 404)
  }

  const workerUserId = booking.workerId?.userId

  // Spec §8 race condition rule: accepting requires atomic check from PENDING
  if (nextStatus === 'ACCEPTED') {
    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, status: 'PENDING' },
      {
        $set: { status: 'ACCEPTED' },
        $push: { timeline: { status: 'ACCEPTED', at: new Date(), by: actor._id } },
      },
      { new: true },
    )
      .populate('customerId', 'name phone email avatarUrl')
      .populate({
        path: 'workerId',
        populate: { path: 'userId', select: 'name phone email avatarUrl' },
      })
      .populate('categoryId', 'name slug icon')

    if (!updated) {
      throw new AppError('ALREADY_PROCESSED', 'Booking has already been updated or accepted', 400)
    }
    return sanitizeBooking(updated, actor.role)
  }

  transition(booking, nextStatus, actor, workerUserId)
  await booking.save()

  return getBookingById(bookingId, actor)
}

export async function setFinalPrice(bookingId, amount, actor) {
  const booking = await Booking.findById(bookingId).populate('workerId', 'userId')
  if (!booking) {
    throw new AppError('BOOKING_NOT_FOUND', 'Booking not found', 404)
  }

  const workerUserId = booking.workerId?.userId
  transition(booking, 'PRICE_SET', actor, workerUserId)

  booking.final = {
    amount,
    setBy: actor._id,
  }

  await booking.save()
  return getBookingById(bookingId, actor)
}

export async function confirmFinalPrice(bookingId, actor, paymentMethod = 'UPI') {
  const booking = await Booking.findById(bookingId).populate('workerId', 'userId')
  if (!booking) {
    throw new AppError('BOOKING_NOT_FOUND', 'Booking not found', 404)
  }

  const workerUserId = booking.workerId?.userId
  transition(booking, 'COMPLETED', actor, workerUserId)

  booking.final.confirmedAt = new Date()
  booking.final.paymentMethod = paymentMethod
  await booking.save()

  // Atomically increment worker's completed jobs counter
  if (booking.workerId?._id) {
    await WorkerProfile.findByIdAndUpdate(booking.workerId._id, {
      $inc: { jobsCompleted: 1 },
    })
  }

  return getBookingById(bookingId, actor)
}
