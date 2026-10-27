import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api.js'
import { useAiStore } from '../../store/aiStore.js'
import { drawerVariants, leftDrawerVariants, modalOverlayVariants } from '../../utils/motion.js'
import { WORKER_HERO_GALLERY, getWorkerAvatar } from '../../config/images.js'
import {
  X,
  Star,
  ShieldCheck,
  MapPin,
  Clock,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  AlertCircle,
  Maximize2,
} from 'lucide-react'

function getDistanceKm(coord1, coord2) {
  if (!coord1 || !coord2) return null
  const [lat1, lon1] = coord1
  const [lat2, lon2] = coord2
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return (R * c).toFixed(1)
}

export default function WorkerDetailPanel({
  workerId,
  onClose,
  onBook,
  customerLocation,
  workerDistanceM,
}) {
  const [worker, setWorker] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  const isAiChatOpen = useAiStore((s) => s.isOpen)
  const isLargeScreen = typeof window !== 'undefined' ? window.innerWidth >= 860 : true
  const isLeftDrawer = isAiChatOpen && isLargeScreen

  // On small mobile/tablet screens, auto-minimize chat so drawer has full focus
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 860 && isAiChatOpen && workerId) {
      useAiStore.getState().close()
    }
  }, [workerId, isAiChatOpen])

  const distanceKm =
    workerDistanceM != null && !isNaN(workerDistanceM)
      ? (Number(workerDistanceM) / 1000).toFixed(1)
      : worker?.location?.coordinates?.length === 2 && customerLocation
      ? getDistanceKm(customerLocation, [
          worker.location.coordinates[1],
          worker.location.coordinates[0],
        ])
      : null

  useEffect(() => {
    if (!workerId) return
    setActiveImageIndex(0)
    setLightboxPhoto(null)
    setLoading(true)
    setError('')
    Promise.all([
      api.get(`/workers/${workerId}`).then((res) => setWorker(res.data.data)),
      api
        .get(`/reviews/worker/${workerId}`)
        .then((res) => setReviews(res.data.data))
        .catch(() => []),
    ])
      .catch((err) => {
        setError(
          err.response?.data?.error?.message || 'Could not load worker details',
        )
      })
      .finally(() => setLoading(false))
  }, [workerId])

  if (!workerId) return null

  // Build hero gallery using worker uploaded portfolio photos, falling back to presets
  const workerAvatar =
    worker?.userId?.avatarUrl || getWorkerAvatar(workerId)
  const workerUploadedPhotos = Array.isArray(worker?.photos) && worker.photos.length > 0 ? worker.photos : []
  const gallery = [
    workerAvatar,
    ...(workerUploadedPhotos.length > 0 ? workerUploadedPhotos : WORKER_HERO_GALLERY.slice(0, 3)),
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1380] overflow-hidden">
        {/* Backdrop */}
        <motion.div
          variants={modalOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className={`absolute inset-0 ${
            isLeftDrawer ? 'bg-slate-900/15' : 'bg-slate-900/40 backdrop-blur-xs'
          } transition-opacity`}
        />

        {/* Slide-over Drawer - Automatically shifts to the LEFT side when AI Chat is Open, and RIGHT when Chat is Closed */}
        <div
          className={`fixed inset-y-0 flex max-w-full ${
            isLeftDrawer ? 'left-0 pr-10' : 'right-0 pl-10'
          }`}
        >
          <motion.div
            key={isLeftDrawer ? 'left-drawer' : 'right-drawer'}
            variants={isLeftDrawer ? leftDrawerVariants : drawerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full"
          >
            {/* Image-First Hero Banner */}
            <div className="relative h-60 w-full bg-slate-900 overflow-hidden shrink-0">
              <img
                src={gallery[activeImageIndex] || gallery[0]}
                alt={worker?.userId?.name || 'Worker'}
                className="h-full w-full object-cover transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/40" />

              {/* Top Navigation Controls */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-800 hover:bg-white shadow-md transition-all cursor-pointer"
                  title="Close"
                >
                  {isLeftDrawer ? <X className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(gallery[activeImageIndex] || gallery[0])}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-800 hover:bg-white shadow-md transition-all cursor-pointer"
                    title="Enlarge Photo Preview"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-800 hover:bg-white shadow-md transition-all cursor-pointer"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Carousel navigation buttons */}
              {gallery.length > 1 && (
                <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex((i) => (i > 0 ? i - 1 : gallery.length - 1))
                    }}
                    className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-xs transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex((i) => (i < gallery.length - 1 ? i + 1 : 0))
                    }}
                    className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-xs transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Status Pills over Hero Bottom */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  {worker?.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Partner
                    </span>
                  )}
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md text-white shadow-sm ${
                    worker?.isAvailable ? 'bg-emerald-600/90' : 'bg-slate-700/90'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      worker?.isAvailable ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  {worker?.isAvailable ? 'Available now' : 'Currently offline'}
                </span>
              </div>
            </div>

            {/* Thumbnail Navigation Strip */}
            <div className="flex gap-2 p-3 bg-slate-50 border-b border-slate-200/80 overflow-x-auto shrink-0">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-12 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-orange-500 ring-2 ring-orange-500/20 scale-105'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loading && (
                <div className="flex h-48 items-center justify-center text-sm font-medium text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    <span>Loading worker profile…</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {!loading && worker && (
                <>
                  {/* Name and Rating Summary */}
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {worker.userId?.name}
                    </h2>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {worker.ratingAgg?.avg ? worker.ratingAgg.avg.toFixed(1) : 'New'}
                      </span>
                      <span className="font-semibold text-slate-700">
                        ({worker.ratingAgg?.count || 0} reviews)
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">
                        {worker.jobsCompleted || 0} jobs done
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">
                        {worker.experienceYrs > 0
                          ? `${worker.experienceYrs} yrs exp`
                          : 'Experienced'}
                      </span>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
                      <Briefcase className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                      <p className="text-[11px] text-slate-500 font-medium">Experience</p>
                      <p className="text-xs font-bold text-slate-800">
                        {worker.experienceYrs || 1} Years
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
                      <MapPin className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                      <p className="text-[11px] text-slate-500 font-medium">Distance</p>
                      <p className="text-xs font-bold text-slate-800">
                        {distanceKm ? `${distanceKm} km` : 'Local'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
                      <Clock className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                      <p className="text-[11px] text-slate-500 font-medium">Status</p>
                      <p className="text-xs font-bold text-emerald-600">
                        {worker.isAvailable ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>

                  {/* About / Bio */}
                  {worker.bio && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        About
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed rounded-xl bg-slate-50/60 border border-slate-100 p-3">
                        {worker.bio}
                      </p>
                    </div>
                  )}

                  {/* Work Portfolio Photos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Work Portfolio {workerUploadedPhotos.length > 0 ? `(${workerUploadedPhotos.length})` : ''}
                      </h4>
                      <span className="text-[11px] font-semibold text-orange-600">
                        {workerUploadedPhotos.length > 0 ? 'Click photo to enlarge' : 'Verified standard service'}
                      </span>
                    </div>

                    {workerUploadedPhotos.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {workerUploadedPhotos.map((photo, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => setLightboxPhoto(photo)}
                            className="relative h-20 rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs group cursor-pointer hover:border-orange-500 transition-all hover:shadow-md"
                          >
                            <img
                              src={photo}
                              alt={`Work photo ${pIdx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                e.currentTarget.src = WORKER_HERO_GALLERY[0]
                              }}
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded p-1">
                              <Maximize2 className="w-2.5 h-2.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {WORKER_HERO_GALLERY.slice(0, 3).map((photo, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => setLightboxPhoto(photo)}
                            className="relative h-20 rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs group cursor-pointer hover:border-orange-500 transition-all"
                          >
                            <img
                              src={photo}
                              alt={`Sample job ${pIdx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors" />
                            <span className="absolute bottom-1 right-1 text-[9px] font-extrabold bg-black/60 text-white px-1 py-0.5 rounded backdrop-blur-xs">
                              Sample
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rates & Services Card */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Rates & Services
                    </h4>
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5 divide-y divide-slate-100">
                      <div className="flex items-center justify-between text-sm pb-2">
                        <span className="font-medium text-slate-600">
                          Inspection / Visit Fee
                        </span>
                        <span className="font-extrabold text-slate-900">
                          ₹{worker.visitCharge || 0}
                        </span>
                      </div>

                      {worker.skills?.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm pt-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{s.categoryId?.icon || '🛠️'}</span>
                            <span className="font-semibold text-slate-800">
                              {s.categoryId?.name || 'Service'}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900">
                            ₹{s.baseRate}{' '}
                            <span className="text-xs font-normal text-slate-500">
                              {s.rateUnit === 'PER_HOUR' ? '/ hr' : '/ visit'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Coverage Area Card */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Coverage Area
                    </h4>
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-600">Service Radius:</span>
                        <span className="font-bold text-slate-900">
                          {(worker.serviceRadiusM / 1000).toFixed(0)} km around base
                        </span>
                      </div>
                      {worker.address?.city && (
                        <p className="text-slate-500 pt-1">
                          Base location:{' '}
                          <span className="font-semibold text-slate-700">
                            {worker.address.area ? `${worker.address.area}, ` : ''}
                            {worker.address.city}
                          </span>
                          {distanceKm && (
                            <span className="ml-1 text-orange-600 font-semibold">
                              (~{distanceKm} km from your pin)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Customer Reviews Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Customer Reviews ({reviews.length})
                      </h4>
                      <span className="text-xs font-bold text-amber-600">
                        ★ {worker.ratingAgg?.avg ? worker.ratingAgg.avg.toFixed(1) : 'New'}
                      </span>
                    </div>

                    {reviews.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                        No customer reviews yet. Be the first to book!
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {reviews.map((r) => (
                          <div
                            key={r._id}
                            className="rounded-xl border border-slate-200/70 bg-white p-3 text-xs space-y-1.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">
                                {r.customerId?.name || 'Verified Customer'}
                              </span>
                              <div className="flex text-amber-400">
                                {[...Array(r.rating || 5)].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                              </div>
                            </div>
                            {r.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {r.tags.map((t, i) => (
                                  <span
                                    key={i}
                                    className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            {r.text && (
                              <p className="text-slate-600 italic">"{r.text}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sticky Bottom Actions Bar */}
            {!loading && worker && (
              <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur-md p-4 flex items-center gap-3 shadow-lg">
                <button
                  type="button"
                  title="WhatsApp unlocked after booking acceptance"
                  className="flex items-center justify-center h-12 w-12 rounded-2xl border border-slate-300 text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>

                <button
                  onClick={() => onBook(worker)}
                  disabled={!worker.isAvailable}
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>
                    {worker.isAvailable ? 'Book This Worker' : 'Currently Offline'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Full-screen Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[3500] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-5 right-5 h-11 w-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer z-10"
            title="Close Preview"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-4xl max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto}
              alt="Full Preview"
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
              onError={(e) => {
                e.currentTarget.src = WORKER_HERO_GALLERY[0]
              }}
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-white/80 select-none">
            Click outside or tap close to return
          </p>
        </div>
      )}
    </AnimatePresence>
  )
}
