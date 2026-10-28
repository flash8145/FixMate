import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../config/db.js'
import { BCRYPT_COST } from '../config/constants.js'
import { User } from '../modules/auth/user.model.js'
import { WorkerProfile } from '../modules/workers/workerProfile.model.js'
import { Category } from '../modules/categories/category.model.js'
import { PricingConfig } from '../modules/pricing/pricingConfig.model.js'
import { Booking } from '../modules/bookings/booking.model.js'
import { Review } from '../modules/reviews/review.model.js'

const CATEGORIES = [
  { slug: 'plumber', name: 'Plumber', icon: '🔧' },
  { slug: 'electrician', name: 'Electrician', icon: '💡' },
  { slug: 'carpenter', name: 'Carpenter', icon: '🪚' },
  { slug: 'ac-technician', name: 'AC Technician', icon: '❄️' },
  { slug: 'painter', name: 'Painter', icon: '🎨' },
]

// Pune coordinate center: [18.5204, 73.8567]
// Note: GeoJSON is [lng, lat]
const WORKER_DATA = [
  {
    name: 'Rajesh Kumar',
    phone: '9820011111',
    email: 'rajesh.plumber@fixmate.test',
    categorySlug: 'plumber',
    baseRate: 350,
    visitCharge: 150,
    experienceYrs: 8,
    bio: 'Licensed plumber with 8+ years specializing in pipe leaks, sanitary fittings, tap replacements, and tank maintenance.',
    coordinates: [73.8567, 18.5204], // Pune Center / Shivaji Nagar [lng, lat]
    city: 'Pune',
    area: 'Shivaji Nagar',
    serviceRadiusKm: 12,
    ratingAvg: 4.8,
    ratingCount: 14,
    ratingSum: 67,
    jobsCompleted: 42,
  },
  {
    name: 'Amit Patil',
    phone: '9820022222',
    email: 'amit.electrician@fixmate.test',
    categorySlug: 'electrician',
    baseRate: 300,
    visitCharge: 120,
    experienceYrs: 6,
    bio: 'Expert electrician for home rewiring, short circuit diagnostics, MCB trips, switchboard installation, and inverter setups.',
    coordinates: [73.8183, 18.5074], // Kothrud [lng, lat]
    city: 'Pune',
    area: 'Kothrud',
    serviceRadiusKm: 10,
    ratingAvg: 4.9,
    ratingCount: 22,
    ratingSum: 108,
    jobsCompleted: 68,
  },
  {
    name: 'Suresh Sutar',
    phone: '9820033333',
    email: 'suresh.carpenter@fixmate.test',
    categorySlug: 'carpenter',
    baseRate: 500,
    visitCharge: 200,
    experienceYrs: 12,
    bio: 'Custom furniture repair, door lock repairs, modular kitchen hinges adjustment, and bespoke woodwork repairs.',
    coordinates: [73.9167, 18.5679], // Viman Nagar [lng, lat]
    city: 'Pune',
    area: 'Viman Nagar',
    serviceRadiusKm: 15,
    ratingAvg: 4.7,
    ratingCount: 18,
    ratingSum: 85,
    jobsCompleted: 55,
  },
  {
    name: 'Vikram Deshmukh',
    phone: '9820044444',
    email: 'vikram.ac@fixmate.test',
    categorySlug: 'ac-technician',
    baseRate: 600,
    visitCharge: 250,
    experienceYrs: 7,
    bio: 'Specialist in split & window AC gas charging, jet pump servicing, compressor diagnostics, and copper piping leak fixes.',
    coordinates: [73.7868, 18.559], // Baner [lng, lat]
    city: 'Pune',
    area: 'Baner',
    serviceRadiusKm: 15,
    ratingAvg: 4.6,
    ratingCount: 11,
    ratingSum: 51,
    jobsCompleted: 31,
  },
  {
    name: 'Ramesh Jadhav',
    phone: '9820055555',
    email: 'ramesh.painter@fixmate.test',
    categorySlug: 'painter',
    baseRate: 400,
    visitCharge: 150,
    experienceYrs: 10,
    bio: 'Interior & exterior waterproofing, wall dampness treatment, texture design painting, and touch-up plastering.',
    coordinates: [73.8765, 18.5108], // Camp [lng, lat]
    city: 'Pune',
    area: 'Camp',
    serviceRadiusKm: 10,
    ratingAvg: 4.8,
    ratingCount: 16,
    ratingSum: 77,
    jobsCompleted: 39,
  },
  {
    name: 'Santosh Shinde',
    phone: '9820066666',
    email: 'santosh.plumber@fixmate.test',
    categorySlug: 'plumber',
    baseRate: 250,
    visitCharge: 100,
    experienceYrs: 4,
    bio: 'Prompt emergency plumbing, drain unclogging, water heater connections, and bathroom leak repairs.',
    coordinates: [73.9298, 18.5089], // Hadapsar [lng, lat]
    city: 'Pune',
    area: 'Hadapsar',
    serviceRadiusKm: 8,
    ratingAvg: 4.5,
    ratingCount: 9,
    ratingSum: 41,
    jobsCompleted: 19,
  },
]

async function seed() {
  console.log('Connecting to database...')
  await connectDB()

  console.log('Cleaning up existing demo collections...')
  // Note: Only cleans test data
  await Promise.all([
    Category.deleteMany({}),
    PricingConfig.deleteMany({}),
  ])

  console.log('Seeding categories...')
  const categoryMap = {}
  for (const cat of CATEGORIES) {
    const saved = await Category.create(cat)
    categoryMap[cat.slug] = saved
  }

  console.log('Seeding default Pricing Configuration...')
  await PricingConfig.create({
    perKmRate: 15,
    freeDistanceM: 1000,
    urgencyFee: 100,
    nightMultiplier: 1.25,
    nightStartHour: 21,
    nightEndHour: 6,
    estimateSpreadPct: 0.15,
    deviationThresholdPct: 0.2,
  })

  console.log('Creating demo admin and customer accounts...')
  const passwordHash = await bcrypt.hash('Password123', BCRYPT_COST)

  // Demo Admin
  await User.findOneAndUpdate(
    { phone: '9999999999' },
    {
      name: 'System Admin',
      phone: '9999999999',
      email: 'admin@fixmate.test',
      passwordHash,
      role: 'admin',
      isActive: true,
    },
    { upsert: true, new: true },
  )

  // Demo Customer
  const demoCustomer = await User.findOneAndUpdate(
    { phone: '9888888888' },
    {
      name: 'Aarav Sharma',
      phone: '9888888888',
      email: 'aarav.customer@fixmate.test',
      passwordHash,
      role: 'customer',
      isActive: true,
    },
    { upsert: true, new: true },
  )

  console.log('Seeding workers and worker profiles around Pune...')
  const seededWorkers = []

  for (const w of WORKER_DATA) {
    const user = await User.findOneAndUpdate(
      { phone: w.phone },
      {
        name: w.name,
        phone: w.phone,
        email: w.email,
        passwordHash,
        role: 'worker',
        isActive: true,
      },
      { upsert: true, new: true },
    )

    const cat = categoryMap[w.categorySlug]

    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        bio: w.bio,
        upiId: w.upiId || `${w.phone}@upi`,
        experienceYrs: w.experienceYrs,
        skills: [
          {
            categoryId: cat._id,
            baseRate: w.baseRate,
            rateUnit: 'PER_VISIT',
          },
        ],
        visitCharge: w.visitCharge,
        location: {
          type: 'Point',
          coordinates: w.coordinates, // [lng, lat]
        },
        address: {
          line: `${w.area} Main Road`,
          area: w.area,
          city: w.city,
          pincode: '411001',
        },
        serviceRadiusM: w.serviceRadiusKm * 1000,
        isAvailable: true,
        isVerified: true,
        ratingAgg: {
          sum: w.ratingSum,
          count: w.ratingCount,
          avg: w.ratingAvg,
        },
        jobsCompleted: w.jobsCompleted,
      },
      { upsert: true, new: true },
    )

    seededWorkers.push({ user, profile, category: cat })
  }

  console.log('Seeding sample bookings & reviews...')
  const primaryWorker = seededWorkers[0] // Rajesh Kumar (Plumber)
  const secondaryWorker = seededWorkers[1] // Amit Patil (Electrician)

  // Clean test bookings for demo customer
  await Booking.deleteMany({ customerId: demoCustomer._id })

  // 1. Completed Booking with Review
  const completedBooking = await Booking.create({
    code: 'FM-7K9P2X',
    customerId: demoCustomer._id,
    workerId: primaryWorker.profile._id,
    categoryId: primaryWorker.category._id,
    problemText: 'Bathroom shower mixer cartridge replacement and leak fix.',
    photos: [],
    address: {
      line: 'Flat 302, Green Glen Apts',
      city: 'Pune',
      location: {
        type: 'Point',
        coordinates: [73.8567, 18.5204],
      },
    },
    scheduledAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
    urgency: 'NORMAL',
    estimate: {
      breakdown: {
        visitCharge: 150,
        serviceBase: 350,
        travelCharge: 45,
        urgencyFee: 0,
        nightMultiplier: 1,
        isNight: false,
        subtotal: 545,
        total: 545,
      },
      min: 463,
      max: 627,
    },
    final: {
      amount: 550,
      setBy: primaryWorker.user._id,
      confirmedAt: new Date(Date.now() - 86400000 * 1.8),
    },
    status: 'COMPLETED',
    timeline: [
      { status: 'PENDING', at: new Date(Date.now() - 86400000 * 2.1), by: demoCustomer._id },
      { status: 'ACCEPTED', at: new Date(Date.now() - 86400000 * 2.0), by: primaryWorker.user._id },
      { status: 'IN_PROGRESS', at: new Date(Date.now() - 86400000 * 1.9), by: primaryWorker.user._id },
      { status: 'PRICE_SET', at: new Date(Date.now() - 86400000 * 1.85), by: primaryWorker.user._id },
      { status: 'COMPLETED', at: new Date(Date.now() - 86400000 * 1.8), by: demoCustomer._id },
    ],
  })

  // Add review for completed booking
  await Review.deleteMany({ bookingId: completedBooking._id })
  await Review.create({
    bookingId: completedBooking._id,
    workerId: primaryWorker.profile._id,
    customerId: demoCustomer._id,
    rating: 5,
    tags: ['Punctual', 'Clean Workmanship', 'Fair & Transparent Price'],
    text: 'Rajesh arrived right on time and fixed the shower mixer without creating any mess. Highly professional!',
  })

  // 2. Active Accepted Booking
  await Booking.create({
    code: 'FM-3M8R4L',
    customerId: demoCustomer._id,
    workerId: secondaryWorker.profile._id,
    categoryId: secondaryWorker.category._id,
    problemText: 'Main circuit breaker trips whenever the geyser and microwave run simultaneously.',
    photos: [],
    address: {
      line: 'Flat 302, Green Glen Apts',
      city: 'Pune',
      location: {
        type: 'Point',
        coordinates: [73.8567, 18.5204],
      },
    },
    scheduledAt: new Date(Date.now() + 14400000), // In 4 hours
    urgency: 'IMMEDIATE',
    estimate: {
      breakdown: {
        visitCharge: 120,
        serviceBase: 300,
        travelCharge: 60,
        urgencyFee: 100,
        nightMultiplier: 1,
        isNight: false,
        subtotal: 580,
        total: 580,
      },
      min: 493,
      max: 667,
    },
    status: 'ACCEPTED',
    timeline: [
      { status: 'PENDING', at: new Date(Date.now() - 3600000), by: demoCustomer._id },
      { status: 'ACCEPTED', at: new Date(Date.now() - 1800000), by: secondaryWorker.user._id },
    ],
  })

  console.log(`
=====================================================
FixMate Database Seeded Successfully!
=====================================================
Demo Accounts Ready for Testing (Login via Phone, Name, or Email):

[Customer Account]
Name:     Aarav Sharma
Email:    aarav.customer@fixmate.test
Phone:    9888888888
Password: Password123
Role:     customer

[Worker Account - Plumber]
Name:     Rajesh Kumar
Email:    rajesh.plumber@fixmate.test
Phone:    9820011111
Password: Password123
Role:     worker

[Worker Account - Electrician]
Name:     Amit Patil
Email:    amit.electrician@fixmate.test
Phone:    9820022222
Password: Password123
Role:     worker

[Admin Account]
Name:     System Admin
Email:    admin@fixmate.test
Phone:    9999999999
Password: Password123
Role:     admin

Coverage Center: Pune, Maharashtra (18.5204, 73.8567)
=====================================================
  `)

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
