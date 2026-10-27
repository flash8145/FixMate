import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api.js'
import { useAuthStore } from '../../store/authStore.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { modalVariants, modalOverlayVariants } from '../../utils/motion.js'
import { getServiceImage } from '../../config/images.js'
import LocationPickerModal from '../../components/map/LocationPickerModal.jsx'
import { reverseGeocode } from '../../services/geocoding.js'
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  Navigation,
  Map,
  Bookmark,
} from 'lucide-react'

// Suggested quick problem tags per category type
const PROBLEM_TAGS_MAP = {
  ac: [
    { label: 'AC not cooling properly', icon: '❄️' },
    { label: 'Water leakage', icon: '💧' },
    { label: 'Strange noise', icon: '🔊' },
    { label: 'Not turning on', icon: '⚡' },
    { label: 'Gas refill needed', icon: '🧪' },
    { label: 'Other issue', icon: '🔧' },
  ],
  plumb: [
    { label: 'Water pipe leakage', icon: '💧' },
    { label: 'Blocked drain / toilet', icon: '🚽' },
    { label: 'Tap / faucet repair', icon: '🚰' },
    { label: 'Low water pressure', icon: '📉' },
    { label: 'Water tank issue', icon: '🛢️' },
    { label: 'Other issue', icon: '🔧' },
  ],
  electr: [
    { label: 'Frequent MCB trip', icon: '⚡' },
    { label: 'Light / fan switch repair', icon: '💡' },
    { label: 'Short circuit wiring', icon: '🔌' },
    { label: 'Appliance power fault', icon: '🔋' },
    { label: 'Inverter / generator', icon: '⚙️' },
    { label: 'Other issue', icon: '🔧' },
  ],
  carpent: [
    { label: 'Door hinge / lock fix', icon: '🚪' },
    { label: 'Furniture assembly', icon: '🪑' },
    { label: 'Cabinet woodwork repair', icon: '🔨' },
    { label: 'Window frame repair', icon: '🪟' },
    { label: 'Other issue', icon: '🔧' },
  ],
  default: [
    { label: 'Routine inspection', icon: '🔍' },
    { label: 'Major repair needed', icon: '🛠️' },
    { label: 'Unusual noise or smell', icon: '⚠️' },
    { label: 'Complete breakdown', icon: '🛑' },
    { label: 'Part replacement', icon: '⚙️' },
    { label: 'Other issue', icon: '📝' },
  ],
}

function getQuickTags(categoryName = '') {
  const norm = categoryName.toLowerCase()
  if (norm.includes('ac') || norm.includes('air')) return PROBLEM_TAGS_MAP.ac
  if (norm.includes('plumb')) return PROBLEM_TAGS_MAP.plumb
  if (norm.includes('electr')) return PROBLEM_TAGS_MAP.electr
  if (norm.includes('carpent')) return PROBLEM_TAGS_MAP.carpent
  return PROBLEM_TAGS_MAP.default
}

export default function BookingModal({
  worker,
  activeCategoryId,
  customerLocation,
  onClose,
  onSuccess,
}) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const userAddress = user?.address

  // Current active step: 1 (Problem), 2 (Schedule & Address), 3 (Confirm)
  const [currentStep, setCurrentStep] = useState(1)

  // Default initial category from activeCategoryId or worker's first skill
  const initialCategoryId =
    worker?.skills?.find((s) => {
      const id = s.categoryId?._id || s.categoryId
      return id?.toString() === activeCategoryId?.toString()
    })?.categoryId?._id ||
    worker?.skills?.[0]?.categoryId?._id ||
    worker?.skills?.[0]?.categoryId ||
    ''

  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [problemText, setProblemText] = useState('')
  const [selectedQuickTag, setSelectedQuickTag] = useState('')

  // Pre-populate address from user's permanent address if available
  const [addressLine, setAddressLine] = useState(userAddress?.line || '')
  const [area, setArea] = useState(userAddress?.area || '')
  const [city, setCity] = useState(userAddress?.city || worker?.address?.city || 'Pune')
  const [pincode, setPincode] = useState(userAddress?.pincode || '')
  const [bookingCoords, setBookingCoords] = useState(
    userAddress?.location?.coordinates?.length === 2 && userAddress.location.coordinates[1]
      ? [userAddress.location.coordinates[1], userAddress.location.coordinates[0]]
      : customerLocation || [18.5204, 73.8567],
  )

  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')

  const [urgency, setUrgency] = useState('NORMAL')

  // Default to 2 hours from now
  const getDefaultDateTime = () => {
    const d = new Date()
    d.setHours(d.getHours() + 2)
    d.setMinutes(0, 0, 0)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${mins}`
  }

  const [scheduledAt, setScheduledAt] = useState(getDefaultDateTime())
  const [estimate, setEstimate] = useState(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  const debouncedCategory = useDebounce(categoryId, 200)
  const debouncedUrgency = useDebounce(urgency, 200)
  const debouncedScheduledAt = useDebounce(scheduledAt, 300)
  const debouncedCoords = useDebounce(bookingCoords, 300)

  // Authoritative server-calculated estimate calculation using current booking location
  useEffect(() => {
    if (!worker?._id || !debouncedCategory || !debouncedCoords) return

    setIsEstimating(true)
    setEstimateError('')

    api
      .post('/bookings/estimate', {
        workerId: worker._id,
        categoryId: debouncedCategory,
        lat: debouncedCoords[0],
        lng: debouncedCoords[1],
        scheduledAt: debouncedScheduledAt,
        urgency: debouncedUrgency,
      })
      .then((res) => {
        setEstimate(res.data.data.estimate)
      })
      .catch((err) => {
        setEstimate(null)
        setEstimateError(
          err.response?.data?.error?.message || 'Could not calculate estimate',
        )
      })
      .finally(() => setIsEstimating(false))
  }, [
    worker?._id,
    debouncedCategory,
    debouncedUrgency,
    debouncedScheduledAt,
    debouncedCoords,
  ])

  // Get selected category details
  const activeSkill = worker?.skills?.find((s) => {
    const id = s.categoryId?._id || s.categoryId
    return id?.toString() === categoryId?.toString()
  })
  const categoryName = activeSkill?.categoryId?.name || 'Service Technician'
  const heroImage = getServiceImage(categoryName)
  const quickTags = getQuickTags(categoryName)

  const handleSelectQuickTag = (tag) => {
    setSelectedQuickTag(tag.label)
    if (!problemText) {
      setProblemText(tag.label)
    } else if (!problemText.includes(tag.label)) {
      setProblemText(`${tag.label}. ${problemText}`)
    }
  }

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setSubmitError('Geolocation is not supported by your browser')
      return
    }
    setIsGpsLoading(true)
    setSubmitError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const details = await reverseGeocode(latitude, longitude)
        if (details.line) setAddressLine(details.line)
        if (details.area) setArea(details.area)
        if (details.city) setCity(details.city)
        if (details.pincode) setPincode(details.pincode)
        setBookingCoords([latitude, longitude])
        setIsGpsLoading(false)
        setLocationNotice('Location auto-filled using your GPS!')
        setTimeout(() => setLocationNotice(''), 3000)
      },
      () => {
        setIsGpsLoading(false)
        setSubmitError('Could not detect GPS location. You can pick your location on the map.')
      },
    )
  }

  const handleSelectMapLocation = (details) => {
    if (details.line) setAddressLine(details.line)
    if (details.area) setArea(details.area)
    if (details.city) setCity(details.city)
    if (details.pincode) setPincode(details.pincode)
    setBookingCoords([details.lat, details.lng])
    setLocationNotice('Location captured from map pin!')
    setTimeout(() => setLocationNotice(''), 3000)
  }

  const handleUseSavedAddress = () => {
    if (userAddress) {
      setAddressLine(userAddress.line || '')
      setArea(userAddress.area || '')
      setCity(userAddress.city || 'Pune')
      setPincode(userAddress.pincode || '')
      if (userAddress.location?.coordinates?.length === 2 && userAddress.location.coordinates[1]) {
        setBookingCoords([userAddress.location.coordinates[1], userAddress.location.coordinates[0]])
      }
      setLocationNotice('Reset to your profile permanent address!')
      setTimeout(() => setLocationNotice(''), 3000)
    }
  }

  const isAddressValid = Boolean(addressLine.trim().length >= 3 && city.trim().length >= 2)

  const handleNext = () => {
    if (currentStep === 1) {
      if (!problemText.trim() || problemText.length < 5) {
        setSubmitError('Please enter at least 5 characters describing the issue.')
        return
      }
      setSubmitError('')
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!addressLine.trim() || addressLine.trim().length < 3) {
        setSubmitError('Street / Apartment address is required (at least 3 characters) to continue.')
        return
      }
      if (!city.trim() || city.trim().length < 2) {
        setSubmitError('City name is required.')
        return
      }
      setSubmitError('')
      setCurrentStep(3)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setSubmitError('Please sign in as a customer to book this service.')
      return
    }
    if (user.role !== 'customer') {
      setSubmitError(
        'Only customer accounts can create bookings. Please sign in as a customer.',
      )
      return
    }
    if (!problemText.trim() || problemText.length < 5) {
      setSubmitError('Please describe the problem in at least 5 characters.')
      return
    }
    if (!addressLine.trim() || addressLine.trim().length < 3) {
      setSubmitError('Street / apartment address is required to create a booking.')
      return
    }
    if (!city.trim()) {
      setSubmitError('City is required.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const fullLine = [addressLine.trim(), area.trim()].filter(Boolean).join(', ')
      const res = await api.post('/bookings', {
        workerId: worker._id,
        categoryId,
        problemText,
        address: {
          line: fullLine,
          city: city.trim(),
          lat: bookingCoords[0],
          lng: bookingCoords[1],
        },
        scheduledAt,
        urgency,
      })
      setConfirmedBooking(res.data.data)
      onSuccess?.(res.data.data)
    } catch (err) {
      setSubmitError(
        err.response?.data?.error?.message ||
          'Failed to submit booking. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Dim backdrop */}
      <motion.div
        variants={modalOverlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
      />

      {/* Modal Dialog Card */}
      <motion.div
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative z-10 w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]"
      >
        {/* Confirmed State View */}
        {confirmedBooking ? (
          <div className="flex-1 p-8 text-center flex flex-col items-center justify-center space-y-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 tracking-wide uppercase">
                Status: PENDING ACCEPTANCE
              </span>
              <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                Booking #{confirmedBooking.code} Confirmed!
              </h3>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Technician <strong>{worker.userId?.name}</strong> has been notified.
                Direct phone and WhatsApp details will unlock as soon as they accept your request.
              </p>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Estimated Range:</span>
                <span className="font-extrabold text-orange-600 text-sm">
                  ₹{confirmedBooking.estimate?.min} – ₹{confirmedBooking.estimate?.max}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Scheduled Time:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(confirmedBooking.scheduledAt).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Settlement:</span>
                <span className="font-semibold text-slate-800">
                  Direct cash / UPI offline after service
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
              <button
                onClick={() => {
                  onClose()
                  navigate('/my-bookings')
                }}
                className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 transition-all cursor-pointer"
              >
                Go to My Bookings
              </button>
              <button
                onClick={onClose}
                className="rounded-2xl border border-slate-300 py-3.5 px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Left Column: Form & Stepper */}
            <div className="flex-1 flex flex-col justify-between overflow-y-auto p-6 md:p-8">
              <div>
                {/* Header with Title & Stepper */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      Book {categoryName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      With verified specialist {worker.userId?.name}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Animated Stepper Bar */}
                <div className="my-5 flex items-center justify-between px-2">
                  {[
                    { step: 1, title: 'Problem' },
                    { step: 2, title: 'Schedule' },
                    { step: 3, title: 'Confirm' },
                  ].map((s, idx, arr) => (
                    <div key={s.step} className="flex items-center flex-1 last:flex-none">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold transition-all duration-300 ${
                            currentStep === s.step
                              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-4 ring-orange-100'
                              : currentStep > s.step
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {currentStep > s.step ? '✓' : s.step}
                        </div>
                        <span
                          className={`text-xs font-bold hidden sm:inline ${
                            currentStep === s.step
                              ? 'text-orange-600'
                              : currentStep > s.step
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div
                          className={`mx-3 h-0.5 flex-1 rounded-full transition-all duration-300 ${
                            currentStep > s.step ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {submitError && (
                  <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Multi-Step Content with Framer Motion */}
                <AnimatePresence mode="wait">
                  {/* Step 1: Problem Description */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Select Service Category
                        </label>
                        <select
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
                        >
                          {worker.skills?.map((s, idx) => (
                            <option
                              key={idx}
                              value={s.categoryId?._id || s.categoryId}
                            >
                              {s.categoryId?.name || 'Service'} (Base: ₹{s.baseRate})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          What's the problem?
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                          Tell us what's wrong with your {categoryName}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                          {quickTags.map((tag) => (
                            <button
                              key={tag.label}
                              type="button"
                              onClick={() => handleSelectQuickTag(tag)}
                              className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold transition-all border ${
                                selectedQuickTag === tag.label
                                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-base">{tag.icon}</span>
                              <span className="line-clamp-2">{tag.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Add more details (optional)
                          </label>
                          <span className="text-[11px] text-slate-400">
                            {problemText.length}/200
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          maxLength={200}
                          value={problemText}
                          onChange={(e) => setProblemText(e.target.value)}
                          placeholder="E.g., When did the issue start? Any specific error code or leak location?"
                          className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Schedule & Urgency */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Urgency Level
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setUrgency('NORMAL')}
                            className={`rounded-2xl border p-3.5 text-left transition-all ${
                              urgency === 'NORMAL'
                                ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <p className="text-sm font-bold text-slate-900">
                              Standard
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Regular scheduled visit
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setUrgency('IMMEDIATE')}
                            className={`rounded-2xl border p-3.5 text-left transition-all ${
                              urgency === 'IMMEDIATE'
                                ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <p className="text-sm font-bold text-orange-600 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              Immediate / Urgent
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              + Express priority fee
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Preferred Time
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            City <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      {/* Address & Location Auto-fill Controls */}
                      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Service Address & Location
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {userAddress?.line && (
                              <button
                                type="button"
                                onClick={handleUseSavedAddress}
                                className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Fill from your customer profile"
                              >
                                <Bookmark className="w-3 h-3 text-orange-500" />
                                <span>Saved Address</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={handleUseGps}
                              disabled={isGpsLoading}
                              className="flex items-center gap-1 rounded-xl bg-orange-50 border border-orange-200 px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>{isGpsLoading ? '...' : 'Use GPS'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsMapModalOpen(true)}
                              className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Map className="w-3 h-3 text-orange-500" />
                              <span>Pick on Map</span>
                            </button>
                          </div>
                        </div>

                        {locationNotice && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-in fade-in">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{locationNotice}</span>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Street / Apartment / House Address <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] text-slate-400">Required</span>
                          </div>
                          <input
                            type="text"
                            required
                            value={addressLine}
                            onChange={(e) => setAddressLine(e.target.value)}
                            placeholder="e.g. Flat 301, Sunshine Heights, Main Road"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Area / Locality
                            </label>
                            <input
                              type="text"
                              value={area}
                              onChange={(e) => setArea(e.target.value)}
                              placeholder="e.g. Baner"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Pincode
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              value={pincode}
                              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="411045"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        {bookingCoords && (
                          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Location set ({bookingCoords[0].toFixed(3)}, {bookingCoords[1].toFixed(3)}) — distance estimated accurately
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Upfront Estimate & Final Confirmation */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Live Server-Side Pricing Breakdown */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Transparent Estimate Breakdown
                          </span>
                          {isEstimating ? (
                            <span className="text-xs font-medium text-orange-600 animate-pulse">
                              Calculating…
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600">
                              ✓ Live Backend Calculation
                            </span>
                          )}
                        </div>

                        {estimateError && (
                          <p className="text-xs text-rose-600 font-semibold">
                            {estimateError}
                          </p>
                        )}

                        {estimate?.breakdown && (
                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex justify-between">
                              <span>Visit / Inspection Charge:</span>
                              <span className="font-semibold text-slate-900">
                                ₹{estimate.breakdown.visitCharge}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Service Base Labor:</span>
                              <span className="font-semibold text-slate-900">
                                ₹{estimate.breakdown.serviceBase}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Travel Charge (Beyond free allowance):</span>
                              <span className="font-semibold text-slate-900">
                                ₹{estimate.breakdown.travelCharge}
                              </span>
                            </div>
                            {estimate.breakdown.urgencyFee > 0 && (
                              <div className="flex justify-between text-orange-600 font-bold">
                                <span>Urgency Priority Surcharge:</span>
                                <span>+₹{estimate.breakdown.urgencyFee}</span>
                              </div>
                            )}
                            {estimate.breakdown.isNight && (
                              <div className="flex justify-between text-purple-600 font-bold">
                                <span>Night Call Multiplier:</span>
                                <span>×{estimate.breakdown.nightMultiplier}</span>
                              </div>
                            )}
                            {estimate.breakdown.subtotal && (
                              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                                <span>Calculated Subtotal:</span>
                                <span>₹{estimate.breakdown.subtotal}</span>
                              </div>
                            )}

                            {/* Estimated Range Min - Max */}
                            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-extrabold text-slate-900">
                                  Estimated Total Range:
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Final bill agreed on-site
                                </p>
                              </div>
                              <span className="text-xl font-black text-orange-600">
                                ₹{estimate.min} – ₹{estimate.max}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary recap */}
                      <div className="rounded-2xl border border-slate-100 bg-white p-3.5 text-xs text-slate-600 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Problem:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[240px]">
                            {problemText}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Scheduled:</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(scheduledAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Location:</span>
                          <span className="font-semibold text-slate-800">
                            {addressLine ? `${addressLine}, ` : ''}{city}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Step Navigation Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s - 1)}
                    className="flex items-center gap-1.5 rounded-2xl border border-slate-300 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentStep === 2 && !isAddressValid}
                    className={`flex items-center gap-2 rounded-2xl px-6 py-3.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer ${
                      currentStep === 2 && !isAddressValid
                        ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700'
                    }`}
                  >
                    <span>{currentStep === 2 && !isAddressValid ? 'Enter Street Address to Continue' : 'Continue'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isEstimating || !estimate}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-7 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Requesting Booking…' : 'Confirm & Request Booking'}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Hero Showcase Card (from reference image) */}
            <div className="hidden md:flex md:w-72 lg:w-80 relative flex-col justify-end p-6 bg-slate-950 overflow-hidden text-white shrink-0">
              <img
                src={heroImage}
                alt={categoryName}
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />

              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  FixMate Guarantee
                </div>

                <h3 className="text-xl font-extrabold leading-tight">
                  Reliable {categoryName} at Your Doorstep
                </h3>

                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Verified Professionals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Upfront Pricing Estimate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No Hidden Fees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Direct WhatsApp Coordination</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Map Location Picker Modal */}
      <LocationPickerModal
        isOpen={isMapModalOpen}
        initialPosition={bookingCoords}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={handleSelectMapLocation}
      />
    </div>
  )
}
