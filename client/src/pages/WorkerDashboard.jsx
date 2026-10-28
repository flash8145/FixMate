import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../services/api.js'
import { useAuthStore } from '../store/authStore.js'
import { getWorkerAvatar } from '../config/images.js'
import { pageVariants, modalVariants, modalOverlayVariants } from '../utils/motion.js'
import CustomerLocationModal from '../features/booking/CustomerLocationModal.jsx'
import {
  Briefcase,
  Star,
  Clock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  RefreshCw,
  X,
  ChevronRight,
} from 'lucide-react'


const statusStyles = {
  PENDING: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-400',
    label: 'Pending',
  },
  ACCEPTED: {
    bg: 'bg-blue-50 text-blue-800 border-blue-200/80',
    dot: 'bg-blue-500',
    label: 'Accepted',
  },
  IN_PROGRESS: {
    bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
    dot: 'bg-indigo-500',
    label: 'In Progress',
  },
  PRICE_SET: {
    bg: 'bg-purple-50 text-purple-800 border-purple-200/80',
    dot: 'bg-purple-500',
    label: 'Price Set',
  },
  COMPLETED: {
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    label: 'Completed',
  },
  REJECTED: {
    bg: 'bg-rose-50 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    label: 'Rejected',
  },
  CANCELLED: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    label: 'Cancelled',
  },
}

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  const [profile, setProfile] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [toggleError, setToggleError] = useState('')

  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [activeTab, setActiveTab] = useState('PENDING') // 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL'

  // Modal / prompt for setting final price
  const [finalPriceModal, setFinalPriceModal] = useState(null) // { bookingId, code, estimateMax }
  const [finalPriceInput, setFinalPriceInput] = useState('')
  const [finalPriceError, setFinalPriceError] = useState('')

  // Modal for viewing customer profile & booking location on map
  const [selectedBookingLocation, setSelectedBookingLocation] = useState(null)

  const fetchBookings = () => {
    setLoadingBookings(true)
    api
      .get('/bookings/my')
      .then((res) => setBookings(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingBookings(false))
  }

  useEffect(() => {
    if (isBootstrapping) return
    if (!user || user.role !== 'worker') {
      navigate('/login')
      return
    }
    api
      .get('/workers/profile/me')
      .then((res) => {
        setProfile(res.data.data)
        if (res.data.data) {
          fetchBookings()
        }
      })
      .finally(() => setIsLoadingProfile(false))
  }, [isBootstrapping, user, navigate])

  const toggleAvailability = async () => {
    if (!profile) return
    setToggleError('')
    try {
      const res = await api.patch('/workers/availability', {
        isAvailable: !profile.isAvailable,
      })
      setProfile(res.data.data)
    } catch (err) {
      setToggleError(
        err.response?.data?.error?.message || 'Could not update availability',
      )
    }
  }

  const handleStatusChange = async (bookingId, newStatus) => {
    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: newStatus })
      fetchBookings()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Could not update booking status')
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const handleFinalPriceSubmit = async (e) => {
    e.preventDefault()
    if (!finalPriceModal) return
    const amount = Number(finalPriceInput)
    if (!amount || amount <= 0) {
      setFinalPriceError('Please enter a valid positive amount.')
      return
    }

    setActionLoading((prev) => ({ ...prev, [finalPriceModal.bookingId]: true }))
    setFinalPriceError('')

    try {
      await api.patch(`/bookings/${finalPriceModal.bookingId}/final-price`, { amount })
      setFinalPriceModal(null)
      setFinalPriceInput('')
      fetchBookings()
    } catch (err) {
      setFinalPriceError(
        err.response?.data?.error?.message || 'Could not save final price',
      )
    } finally {
      setActionLoading((prev) => ({ ...prev, [finalPriceModal.bookingId]: false }))
    }
  }

  // Filter tabs counts
  const tabCounts = useMemo(() => {
    return {
      PENDING: bookings.filter((b) => b.status === 'PENDING').length,
      IN_PROGRESS: bookings.filter((b) =>
        ['ACCEPTED', 'IN_PROGRESS', 'PRICE_SET'].includes(b.status),
      ).length,
      COMPLETED: bookings.filter((b) => b.status === 'COMPLETED').length,
      ALL: bookings.length,
    }
  }, [bookings])

  // Filtered booking cards
  const filteredBookings = useMemo(() => {
    if (activeTab === 'PENDING') return bookings.filter((b) => b.status === 'PENDING')
    if (activeTab === 'IN_PROGRESS')
      return bookings.filter((b) =>
        ['ACCEPTED', 'IN_PROGRESS', 'PRICE_SET'].includes(b.status),
      )
    if (activeTab === 'COMPLETED') return bookings.filter((b) => b.status === 'COMPLETED')
    return bookings
  }, [bookings, activeTab])

  if (isBootstrapping || isLoadingProfile) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center text-sm font-medium text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span>Loading worker operations hub…</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
          <Briefcase className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Complete your profile to get started
        </h2>
        <p className="text-sm text-slate-500">
          Customers can discover and book you once you've configured your skills, service rates, and base location.
        </p>
        <Link
          to="/worker/profile"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 transition-all"
        >
          <span>Set up profile & rates</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  const isAvailable = profile.isAvailable
  const avatar = user.avatarUrl || getWorkerAvatar(profile._id)

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mx-auto max-w-6xl px-4 sm:px-6 py-8"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Worker Profile & Operational Controls */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-5">
            {/* Identity Card Header */}
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-orange-500/30 p-0.5 shadow-md">
                <img
                  src={avatar}
                  alt={user.name}
                  className="h-full w-full rounded-2xl object-cover"
                />
                <span
                  className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                    isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{user.name}</h2>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  {profile.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Partner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3" />
                      Verification Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3-Column Metrics Row (Rating, Jobs Done, Experience) */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50/80 p-3 border border-slate-100 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Rating
                </p>
                <p className="mt-0.5 text-sm font-black text-amber-600 flex items-center justify-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {profile.ratingAgg?.avg ? profile.ratingAgg.avg.toFixed(1) : '—'}
                </p>
              </div>

              <div className="border-x border-slate-200/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Jobs Done
                </p>
                <p className="mt-0.5 text-sm font-black text-slate-900">
                  {profile.jobsCompleted || 0}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Experience
                </p>
                <p className="mt-0.5 text-sm font-black text-slate-900">
                  {profile.experienceYrs} yrs
                </p>
              </div>
            </div>

            {/* Availability Switch Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">
                    Live Availability
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isAvailable ? 'Visible on customer map' : 'Hidden from search results'}
                  </p>
                </div>

                {/* Animated Switch */}
                <button
                  type="button"
                  onClick={toggleAvailability}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAvailable ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {toggleError && (
                <p className="text-xs text-rose-600 font-semibold">{toggleError}</p>
              )}
            </div>

            {/* Edit Profile CTA */}
            <Link
              to="/worker/profile"
              className="flex items-center justify-center gap-1.5 w-full rounded-2xl border border-slate-300/90 py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              <span>Edit Profile & Rates</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Customer Bookings & Requests Queue */}
        <div className="space-y-4 lg:col-span-2">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Customer Bookings & Requests
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Accept incoming requests and manage live job status
              </p>
            </div>

            <button
              onClick={fetchBookings}
              className="flex items-center gap-1.5 self-start sm:self-auto rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'PENDING', label: 'Pending' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'ALL', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeTab === tab.id
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-100 text-slate-500 font-semibold'
                  }`}
                >
                  {tabCounts[tab.id] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Bookings Queue */}
          {loadingBookings ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto mb-2" />
              Loading requests…
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  No bookings in this tab
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Keep your availability switch ON to receive incoming requests from nearby residents.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredBookings.map((b) => {
                  const statusConfig = statusStyles[b.status] || {
                    bg: 'bg-slate-100 text-slate-700 border-slate-200',
                    dot: 'bg-slate-400',
                    label: b.status,
                  }
                  const isAccepted = ['ACCEPTED', 'IN_PROGRESS', 'PRICE_SET', 'COMPLETED'].includes(
                    b.status,
                  )
                  const customer = b.customerId

                  return (
                    <motion.div
                      key={b._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
                    >
                      {/* Booking Top Info */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                              #{b.code}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <span>{b.categoryId?.icon || '🛠️'}</span>
                              <span>{b.categoryId?.name}</span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-1">
                            Customer: <strong className="text-slate-800">{customer?.name || 'Local Resident'}</strong> · Scheduled for{' '}
                            {new Date(b.scheduledAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${statusConfig.bg}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Problem note card */}
                      <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-3.5 text-xs text-slate-700">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Problem Description
                        </p>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          "{b.problemText}"
                        </p>
                      </div>

                      {/* Job Address & Upfront Range */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {b.address?.line ? `${b.address.line}, ` : ''}{b.address?.city}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400">Estimated Range: </span>
                          <strong className="text-orange-600 font-extrabold text-sm">
                            ₹{b.estimate?.min} – ₹{b.estimate?.max}
                          </strong>
                        </div>
                      </div>

                      {/* Customer Contact Reveal (Strict Privacy: Unmasked only after ACCEPTED) */}
                      {isAccepted && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Customer Contact Unlocked
                            </p>
                            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                              Phone:{' '}
                              <span className="font-mono text-emerald-800">
                                {b.customerPhone || 'Available'}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Coordinate arrival, directions, and offline UPI/cash settlement.
                            </p>
                          </div>

                          {b.whatsAppUrl && (
                            <a
                              href={b.whatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all shrink-0"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>WhatsApp Client</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Final Price details if set */}
                      {b.final?.amount && (
                        <div className="rounded-2xl bg-orange-50/80 border border-orange-200 p-3.5 text-xs text-orange-950 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span>
                              Submitted Final Bill: <strong className="text-sm font-extrabold text-slate-900">₹{b.final.amount}</strong>
                            </span>
                            {b.status === 'COMPLETED' && (
                              <span className="rounded-xl px-2.5 py-0.5 text-[11px] font-bold border border-orange-200 bg-white shadow-2xs text-slate-800">
                                {b.final?.paymentMethod === 'CASH' ? (
                                  <span className="text-emerald-700 font-bold">Paid in: 💵 Cash</span>
                                ) : (
                                  <span className="text-orange-700 font-bold">Paid via: ⚡ Online UPI</span>
                                )}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-xs">
                            {b.status === 'COMPLETED' ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                ✓ Paid & Confirmed by Customer
                              </span>
                            ) : (
                              <span className="text-orange-700">
                                ⏳ Waiting for customer payment confirmation
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Status Transition Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingLocation(b)}
                          className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          <span>View Customer & Map</span>
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          {b.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(b._id, 'REJECTED')}
                                disabled={actionLoading[b._id]}
                                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                ✕ Reject
                              </button>

                              <button
                                onClick={() => handleStatusChange(b._id, 'ACCEPTED')}
                                disabled={actionLoading[b._id]}
                                className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all cursor-pointer"
                              >
                                {actionLoading[b._id] ? 'Accepting…' : '✓ Accept Request'}
                              </button>
                            </>
                          )}

                          {b.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handleStatusChange(b._id, 'IN_PROGRESS')}
                              disabled={actionLoading[b._id]}
                              className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              {actionLoading[b._id] ? 'Updating…' : 'Start Job (Mark In Progress)'}
                            </button>
                          )}

                          {b.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => {
                                setFinalPriceModal({
                                  bookingId: b._id,
                                  code: b.code,
                                  estimateMax: b.estimate?.max,
                                })
                                setFinalPriceInput(String(b.estimate?.min || ''))
                              }}
                              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                            >
                              Submit Final Price
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Final Price Modal */}
      {finalPriceModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <motion.div
            variants={modalOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setFinalPriceModal(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Submit Final Bill
              </h3>
              <button
                onClick={() => setFinalPriceModal(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Booking <strong>#{finalPriceModal.code}</strong> completed. Enter the agreed total amount settled with the customer.
            </p>

            {finalPriceError && (
              <p className="text-xs text-rose-600 font-semibold">{finalPriceError}</p>
            )}

            <form onSubmit={handleFinalPriceSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Final Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    autoFocus
                    value={finalPriceInput}
                    onChange={(e) => {
                      setFinalPriceInput(e.target.value)
                      if (finalPriceError) setFinalPriceError('')
                    }}
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-8 pr-4 text-xl font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setFinalPriceModal(null)}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading[finalPriceModal.bookingId]}
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
                >
                  {actionLoading[finalPriceModal.bookingId] ? 'Submitting…' : 'Submit Bill'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Customer Profile & Map Location Modal */}
      {selectedBookingLocation && (
        <CustomerLocationModal
          isOpen={Boolean(selectedBookingLocation)}
          booking={selectedBookingLocation}
          workerLocation={profile?.location}
          onClose={() => setSelectedBookingLocation(null)}
        />
      )}
    </motion.div>
  )
}

