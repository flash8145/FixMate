import { useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../../services/api.js'
import { modalVariants, modalOverlayVariants } from '../../utils/motion.js'
import { Star, X, AlertCircle } from 'lucide-react'

const AVAILABLE_TAGS = [
  'Punctual & On-Time',
  'Polite & Professional',
  'Clean Workmanship',
  'Fair & Transparent Bill',
  'Quick Turnaround',
  'Expert Diagnostician',
]

export default function ReviewModal({ booking, onClose, onSuccess }) {
  const [rating, setRating] = useState(5)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState([])
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await api.post('/reviews', {
        bookingId: booking._id,
        rating,
        tags: selectedTags,
        text,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          'Could not submit review. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const workerName = booking.workerId?.userId?.name || 'Technician'

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      <motion.div
        variants={modalOverlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
      />

      <motion.div
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Review {workerName}
            </h3>
            <p className="text-xs text-slate-400">Booking #{booking.code}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star rating selector */}
          <div className="text-center py-2 bg-slate-50/70 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Overall Experience Rating
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoveredRating || rating) >= star
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 text-3xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'fill-slate-200 text-slate-200'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            <p className="text-xs font-extrabold text-slate-800 mt-2">
              {rating === 5 && '⭐️ Outstanding service!'}
              {rating === 4 && '👍 Very good experience'}
              {rating === 3 && '😐 Average service'}
              {rating === 2 && '👎 Below expectations'}
              {rating === 1 && '⚠️ Unsatisfactory'}
            </p>
          </div>

          {/* Quick Positive Badges */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              What went great?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Feedback Text Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Feedback note <span className="font-normal text-slate-400 lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tell neighbors what made this technician stand out…"
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Posting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
