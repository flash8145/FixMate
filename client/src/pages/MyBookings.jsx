import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../services/api.js'
import { useAuthStore } from '../store/authStore.js'
import ReviewModal from '../features/reviews/ReviewModal.jsx'
import { getServiceImage } from '../config/images.js'
import { pageVariants } from '../utils/motion.js'
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Star,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  RefreshCw,
  XCircle,
} from 'lucide-react'

const LIFECYCLE_STEPS = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'PRICE_SET', label: 'Price Set' },
  { id: 'COMPLETED', label: 'Completed' },
]

const STATUS_BADGE_STYLES = {
  PENDING: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-400',
    label: 'Pending Acceptance',
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
    label: 'Price Set — Review Needed',
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

export default function MyBookings() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  const [actionLoading, setActionLoading] = useState({})
  const [reviewBooking, setReviewBooking] = useState(null)

  const fetchBookings = () => {
    setLoading(true)
    api
      .get('/bookings/my')
      .then((res) => {
        setBookings(res.data.data)
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Could not fetch your bookings')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isBootstrapping) return
    if (!user) {
      navigate('/login')
      return
    }
    fetchBookings()
  }, [user, isBootstrapping, navigate])

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) return
    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: 'CANCELLED' })
      fetchBookings()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Could not cancel booking')
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const handleConfirmPrice = async (bookingId) => {
    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    try {
      await api.patch(`/bookings/${bookingId}/confirm`)
      fetchBookings()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Could not confirm final price')
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  // Filter counts
  const counts = useMemo(() => {
    return {
      ALL: bookings.length,
      PENDING: bookings.filter((b) => b.status === 'PENDING').length,
      ACTIVE: bookings.filter((b) => ['ACCEPTED', 'IN_PROGRESS', 'PRICE_SET'].includes(b.status)).length,
      COMPLETED: bookings.filter((b) => b.status === 'COMPLETED').length,
      CANCELLED: bookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.status)).length,
    }
  }, [bookings])

  // Filtered list
  const filteredBookings = useMemo(() => {
    if (activeTab === 'PENDING') return bookings.filter((b) => b.status === 'PENDING')
    if (activeTab === 'ACTIVE')
      return bookings.filter((b) => ['ACCEPTED', 'IN_PROGRESS', 'PRICE_SET'].includes(b.status))
    if (activeTab === 'COMPLETED') return bookings.filter((b) => b.status === 'COMPLETED')
    if (activeTab === 'CANCELLED')
      return bookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.status))
    return bookings
  }, [bookings, activeTab])

  if (isBootstrapping || loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 text-center text-sm font-medium text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span>Loading your service bookings…</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Service Bookings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Track and manage your household service appointments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBookings}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>

          <Link
            to="/customer"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Service</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'PENDING', label: 'Pending' },
          { id: 'ACTIVE', label: 'Active' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'CANCELLED', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-500 font-semibold'
              }`}
            >
              {counts[tab.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-4 shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No bookings in this tab</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              You don't have any appointments matching this filter. Explore local experts on the map to request a service.
            </p>
          </div>
          <Link
            to="/customer"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 transition-all"
          >
            Find Workers Near You
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredBookings.map((b) => {
            const statusConfig = STATUS_BADGE_STYLES[b.status] || {
              bg: 'bg-slate-100 text-slate-700 border-slate-200',
              dot: 'bg-slate-400',
              label: b.status,
            }

            const isAccepted = ['ACCEPTED', 'IN_PROGRESS', 'PRICE_SET', 'COMPLETED'].includes(b.status)
            const workerUser = b.workerId?.userId
            const isTerminalNegative = ['REJECTED', 'CANCELLED'].includes(b.status)
            const categoryImage = getServiceImage(b.categoryId?.name)

            // Step index for the timeline
            const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.id === b.status)

            return (
              <div
                key={b._id}
                className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Header bar */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-extrabold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      #{b.code}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Booked{' '}
                      {new Date(b.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${statusConfig.bg}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                    {statusConfig.label}
                  </span>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {/* Service & Worker Info Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="relative h-14 w-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                        <img
                          src={categoryImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white text-base">
                          {b.categoryId?.icon || '🛠️'}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                          {b.categoryId?.name || 'Service'} with{' '}
                          <span className="text-orange-600">
                            {workerUser?.name || 'Assigned Technician'}
                          </span>
                        </h2>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                          "{b.problemText}"
                        </p>
                      </div>
                    </div>

                    {/* Price display: Final amount or estimate range */}
                    <div className="sm:text-right shrink-0">
                      {b.final?.amount ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Final Bill
                          </p>
                          <p className="text-2xl font-black text-slate-900">
                            ₹{b.final.amount}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Upfront Estimate
                          </p>
                          <p className="text-lg font-black text-orange-600">
                            ₹{b.estimate?.min} – ₹{b.estimate?.max}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Animated Status Timeline Stepper */}
                  {!isTerminalNegative && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="relative flex items-center justify-between">
                        {/* Connecting Line */}
                        <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
                        <div
                          className="absolute top-3.5 left-4 h-0.5 bg-emerald-500 transition-all duration-500 -z-0"
                          style={{
                            width: `${(Math.max(0, currentStepIdx) / (LIFECYCLE_STEPS.length - 1)) * 100}%`,
                          }}
                        />

                        {LIFECYCLE_STEPS.map((step, idx) => {
                          const isPassed = idx < currentStepIdx
                          const isCurrent = idx === currentStepIdx

                          // Look for timestamp in b.timeline audit log
                          const historyEntry = b.timeline?.find((t) => t.status === step.id)
                          const stepTime = historyEntry
                            ? new Date(historyEntry.at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : idx === 0
                            ? new Date(b.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : null

                          return (
                            <div
                              key={step.id}
                              className="relative z-10 flex flex-col items-center flex-1"
                            >
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                                  isPassed || (isCurrent && step.id === 'COMPLETED')
                                    ? 'bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-100'
                                    : isCurrent
                                    ? 'bg-orange-500 text-white shadow-md ring-4 ring-orange-100 animate-pulse'
                                    : 'bg-white text-slate-400 border-2 border-slate-200'
                                }`}
                              >
                                {isPassed || (isCurrent && step.id === 'COMPLETED') ? (
                                  '✓'
                                ) : (
                                  idx + 1
                                )}
                              </div>

                              <span
                                className={`mt-2 text-[11px] font-bold text-center leading-tight ${
                                  isCurrent
                                    ? 'text-orange-600'
                                    : isPassed
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </span>

                              {stepTime && (
                                <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:inline">
                                  {stepTime}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Terminal Negative Alert */}
                  {isTerminalNegative && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        This booking has been{' '}
                        <strong>{b.status.toLowerCase()}</strong>. You can book another nearby technician at any time.
                      </span>
                    </div>
                  )}

                  {/* Scheduled Time & Location Info */}
                  <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Scheduled for:</span>
                      <strong className="text-slate-800">
                        {new Date(b.scheduledAt).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Address:</span>
                      <strong className="text-slate-800 truncate max-w-xs">
                        {b.address?.line ? `${b.address.line}, ` : ''}{b.address?.city}
                      </strong>
                    </div>
                  </div>

                  {/* Contact Unlocked Section (Strict Privacy Rule: Only once ACCEPTED) */}
                  {isAccepted ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Technician Contact Unlocked
                          </p>
                          <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                            Direct Phone:{' '}
                            <span className="font-mono text-emerald-800">
                              {b.workerPhone || 'Available'}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Coordinate arrival and settle payments offline via cash or UPI.
                          </p>
                        </div>

                        {b.whatsAppUrl && (
                          <a
                            href={b.whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all shrink-0"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Chat on WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ) : b.status === 'PENDING' ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 text-xs text-slate-500 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        🔒 Technician phone and direct WhatsApp button will unlock immediately once they accept your request.
                      </span>
                    </div>
                  ) : null}

                  {/* Price confirmation box when status is PRICE_SET */}
                  {b.status === 'PRICE_SET' && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                            Final Bill Submitted by Technician
                          </p>
                          <p className="mt-1 text-2xl font-black text-slate-900">
                            ₹{b.final?.amount}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Settled offline in cash or UPI. Confirm below once payment is completed.
                          </p>
                        </div>

                        <button
                          onClick={() => handleConfirmPrice(b._id)}
                          disabled={actionLoading[b._id]}
                          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer shrink-0"
                        >
                          {actionLoading[b._id] ? 'Confirming…' : '✓ Confirm & Complete'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Completed message & Review CTA */}
                  {b.status === 'COMPLETED' && (
                    <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-3.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Job completed and final bill (₹{b.final?.amount}) confirmed.</span>
                      </div>

                      <button
                        onClick={() => setReviewBooking(b)}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 transition-all cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Leave a Review</span>
                      </button>
                    </div>
                  )}

                  {/* Actions (Cancellation) */}
                  {['PENDING', 'ACCEPTED'].includes(b.status) && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleCancel(b._id)}
                        disabled={actionLoading[b._id]}
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading[b._id] ? 'Cancelling…' : 'Cancel Booking'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => {
            fetchBookings()
          }}
        />
      )}
    </motion.div>
  )
}
