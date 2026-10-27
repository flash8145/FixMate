import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api.js'
import { useAuthStore } from '../../store/authStore.js'
import { useAiStore } from '../../store/aiStore.js'
import { useGeoLocation } from '../../hooks/useGeoLocation.js'
import { reverseGeocode } from '../../services/geocoding.js'
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Crosshair,
  MapPin,
} from 'lucide-react'

const QUICK_PROMPTS = [
  '🎨 Find painter near me and book best and affordable painter for me and set work time and date 12pm 27th oct',
  '🔧 Find urgent plumber near me for leak repair',
  '💡 Book affordable electrician for tomorrow 3 PM',
  '📋 Show status of my active bookings',
  '❓ How does FixMate pricing and payment work?',
]

export default function AiAssistantWidget() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { getCurrentPosition } = useGeoLocation()

  const isOpen = useAiStore((s) => s.isOpen)
  const setIsOpen = (val) => (val ? useAiStore.getState().open() : useAiStore.getState().close())
  const initialPrompt = useAiStore((s) => s.initialPrompt)
  const clearInitialPrompt = useAiStore((s) => s.clearInitialPrompt)
  const pinnedLocation = useAiStore((s) => s.pinnedLocation)

  const currentUserId = (user?.id || user?._id || user?.phone)?.toString()
  const storageKey = `fixmate_ai_chat_${currentUserId || 'guest'}`

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`fixmate_ai_chat_${(user?.id || user?._id || user?.phone)?.toString() || 'guest'}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [gpsCoords, setGpsCoords] = useState(null)
  const [useGpsOverride, setUseGpsOverride] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [isConfirmingBooking, setIsConfirmingBooking] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Sync active user's chat to sessionStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(storageKey, JSON.stringify(messages))
      } else {
        sessionStorage.removeItem(storageKey)
      }
    } catch {
      // ignore
    }
  }, [messages, storageKey])

  // Reset chat state whenever active user changes or logs out
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey)
      setMessages(saved ? JSON.parse(saved) : [])
    } catch {
      setMessages([])
    }
    setInputText('')
    setGpsCoords(null)
    setUseGpsOverride(false)
  }, [currentUserId, storageKey])

  // Compute active location WITHOUT triggering automatic browser GPS:
  // 1. If user explicitly requested GPS (via button or chat prompt) -> use GPS
  // 2. Else if user pinned/selected a location on the map -> use Pinned Location
  // 3. Else -> use default saved permanent profile address
  // 4. Fallback -> Pune central
  const activeLocation = useMemo(() => {
    if (useGpsOverride && gpsCoords) {
      return {
        ...gpsCoords,
        source: 'gps',
        isLiveGps: true,
      }
    }

    if (pinnedLocation?.lat && pinnedLocation?.lng) {
      return {
        lat: pinnedLocation.lat,
        lng: pinnedLocation.lng,
        city: pinnedLocation.city || 'Pinned Location',
        line: pinnedLocation.line || pinnedLocation.label || 'Pinned Map Location',
        displayName: pinnedLocation.displayName || pinnedLocation.label || `${pinnedLocation.city || 'Pinned Location'}`,
        source: 'pinned',
        isLiveGps: false,
      }
    }

    if (
      user?.address?.location?.coordinates?.length === 2 &&
      user.address.location.coordinates[0] &&
      user.address.location.coordinates[1]
    ) {
      const line = user.address.line || ''
      const city = user.address.city || 'Pune'
      return {
        lat: user.address.location.coordinates[1],
        lng: user.address.location.coordinates[0],
        city,
        line,
        displayName: [line, city].filter(Boolean).join(', ') || 'Saved Profile Address',
        source: 'profile',
        isLiveGps: false,
      }
    }

    return {
      lat: 18.5204,
      lng: 73.8567,
      city: 'Pune',
      line: 'Pune Central',
      displayName: 'Pune, Maharashtra',
      source: 'default',
      isLiveGps: false,
    }
  }, [useGpsOverride, gpsCoords, pinnedLocation, user])

  // Explicitly trigger device GPS ONLY when user requests it
  const triggerGps = async (announceInChat = true) => {
    setIsLocating(true)
    try {
      const pos = await getCurrentPosition()
      const geo = await reverseGeocode(pos.lat, pos.lng)
      const cleanLine = geo.line || 'Device GPS Location'
      const cleanCity = geo.city || 'Local Area'
      const displayName = [geo.area || cleanLine, cleanCity].filter(Boolean).join(', ')

      const detected = {
        lat: pos.lat,
        lng: pos.lng,
        city: cleanCity,
        line: cleanLine,
        area: geo.area || '',
        displayName,
      }

      setGpsCoords(detected)
      setUseGpsOverride(true)

      if (announceInChat) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `🎯 **Live GPS Activated**: Detected your physical device location at **${displayName}**.\nI will now search workers near this GPS spot.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }

      return detected
    } catch (err) {
      console.warn('GPS permission denied or unavailable:', err.message)
      if (announceInChat) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Could not access GPS (${err.message}). Using your ${
              pinnedLocation ? 'currently pinned map location' : 'default profile address'
            } instead.`,
            isError: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }
      return null
    } finally {
      setIsLocating(false)
    }
  }

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250)
    }
  }, [isOpen])

  // Handle prompt passed from navbar or outside trigger
  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt)
      clearInitialPrompt()
    }
  }, [initialPrompt])

  // Only render for logged-in users
  if (!user) return null

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputText.trim()
    if (!textToSend || isLoading) return

    setInputText('')

    // Check if the user is explicitly telling the agent to use GPS
    let resolvedLocation = activeLocation
    const userRequestedGps =
      /\b(use|detect|get|enable|turn on)\s+(my\s+)?(gps|live location|device location)\b/i.test(textToSend) ||
      /\b(via|using|with)\s+gps\b/i.test(textToSend)

    if (userRequestedGps) {
      const gpsResult = await triggerGps(false)
      if (gpsResult) {
        resolvedLocation = { ...gpsResult, source: 'gps', isLiveGps: true }
      }
    }

    const newUserMsg = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const updatedHistory = [...messages, newUserMsg]
    setMessages(updatedHistory)
    setIsLoading(true)

    try {
      const formattedHistory = updatedHistory.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

      const res = await api.post('/ai/chat', {
        message: textToSend,
        conversationHistory: formattedHistory,
        customerLocation: resolvedLocation,
      })

      const { reply, actionCard } = res.data.data

      // When AI discovers worker(s), trigger cinematic map pan to worker's location and highlight their pin
      if (actionCard) {
        const topWorker = actionCard.worker || actionCard.workers?.[0]
        const wLat = actionCard.lat || topWorker?.lat
        const wLng = actionCard.lng || topWorker?.lng
        const wId = actionCard.workerId || topWorker?.workerId || topWorker?._id
        if (wLat && wLng) {
          useAiStore.getState().setFocusedWorker({
            workerId: wId,
            lat: wLat,
            lng: wLng,
            categoryId: actionCard.categoryId,
            worker: topWorker,
            openDrawer: false,
          })
        }
      }

      const newAssistantMsg = {
        role: 'assistant',
        content: reply,
        actionCard,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, newAssistantMsg])
    } catch (err) {
      console.error('AI chat failed:', err)
      const errorMsg = {
        role: 'assistant',
        content:
          err.response?.data?.error?.message ||
          'Sorry, I encountered an issue while connecting to the assistant. Please try again.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmActionCard = async (actionCard) => {
    if (isConfirmingBooking) return
    setIsConfirmingBooking(true)

    try {
      const scheduledDate = actionCard.scheduledAt ? new Date(actionCard.scheduledAt) : new Date()

      const res = await api.post('/bookings', {
        workerId: actionCard.workerId,
        categoryId: actionCard.categoryId,
        problemText: actionCard.problemText || 'Service requested via FixMate AI Concierge',
        address: {
          line: activeLocation?.line || user?.address?.line || 'Customer Location',
          city: activeLocation?.city || user?.address?.city || 'Pune',
          lat: activeLocation?.lat || 18.5204,
          lng: activeLocation?.lng || 73.8567,
        },
        scheduledAt: scheduledDate.toISOString(),
        urgency: actionCard.urgency || 'NORMAL',
      })

      const newBooking = res.data.data

      // Add assistant confirmation message
      const confirmedMsg = {
        role: 'assistant',
        content: `🎉 **Booking Confirmed!**\n\nYour booking reference is **#${newBooking.code}**. The worker has been notified and will review your request shortly. You can track this booking anytime under **My Bookings**.`,
        actionCard: {
          type: 'BOOKING_CREATED',
          booking: newBooking,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, confirmedMsg])
    } catch (err) {
      console.error('Failed to confirm booking from action card:', err)
      const errorMsg = {
        role: 'assistant',
        content: `Could not complete booking: ${err.response?.data?.error?.message || err.message}`,
        isError: true,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsConfirmingBooking(false)
    }
  }

  const handleResetChat = () => {
    setMessages([])
    setInputText('')
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-[1450]">
        <motion.button
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 text-white shadow-xl shadow-orange-500/30 transition-shadow hover:shadow-orange-500/50 cursor-pointer"
          aria-label="Open FixMate AI Assistant"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <>
              <Sparkles className="h-6 w-6 text-white" />
              {/* Pulse notification badge */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
              </span>
            </>
          )}
        </motion.button>
      </div>

      {/* Slide-Up Chat Window - Constrained below NavBar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-22 right-4 sm:right-6 z-[1400] flex h-[530px] max-h-[calc(100vh-170px)] w-[calc(100vw-32px)] sm:w-[410px] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20 backdrop-blur-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-extrabold tracking-tight">FixMate AI Concierge</h3>
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      NVIDIA
                    </span>
                  </div>
                  <p className="text-[10px] text-white/80">Smart Natural-Language Booking Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleResetChat}
                    title="Reset Conversation"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Location Awareness Ribbon (Pinned Map Pin vs Saved Address vs On-Demand GPS) */}
            <div className="flex items-center justify-between border-b border-slate-200/60 bg-slate-50/90 px-4 py-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-[270px]">
                {activeLocation.source === 'gps' ? (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                ) : activeLocation.source === 'pinned' ? (
                  <MapPin className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                )}

                <span className="font-semibold text-slate-700 truncate">
                  {activeLocation.source === 'gps'
                    ? '🎯 Live GPS: '
                    : activeLocation.source === 'pinned'
                    ? '📌 Pinned Location: '
                    : '🏠 Profile Address: '}
                  {activeLocation.displayName || activeLocation.city}
                </span>
              </div>

              {activeLocation.source === 'gps' ? (
                <button
                  type="button"
                  onClick={() => setUseGpsOverride(false)}
                  className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all shadow-2xs shrink-0 cursor-pointer"
                  title="Switch back to your pinned or profile location"
                >
                  <span>Reset Location</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerGps(true)}
                  disabled={isLocating}
                  className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-orange-600 border border-slate-200 hover:border-orange-300 hover:bg-orange-50/60 transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                  title="Click to detect real device GPS"
                >
                  <Crosshair className={`h-3 w-3 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Detecting…' : 'Use GPS'}</span>
                </button>
              )}
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {/* Welcome Screen / Empty State */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-inner">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h4 className="text-base font-extrabold text-slate-800">
                    Hello, {user.name?.split(' ')[0] || 'there'}! 👋
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 max-w-[320px]">
                    Don't know how to navigate the app? Just tell me what you need in plain English or Hindi.
                  </p>

                  {/* Suggestion Chips */}
                  <div className="mt-5 w-full space-y-2 text-left">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-1">
                      Try asking:
                    </span>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="w-full text-left rounded-xl border border-slate-200/80 bg-white p-2.5 text-xs text-slate-700 hover:border-orange-300 hover:bg-orange-50/50 transition-all shadow-xs cursor-pointer flex items-center justify-between group"
                      >
                        <span className="line-clamp-2 pr-2">{prompt}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-orange-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages list */}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-xs'
                        : msg.isError
                        ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-xs'
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Message Body with Markdown-friendly rendering */}
                    <div className="whitespace-pre-wrap space-y-1">
                      {msg.content.split('\n').map((line, lIdx) => {
                        // Bold highlights
                        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        return (
                          <p
                            key={lIdx}
                            className="text-xs"
                            dangerouslySetInnerHTML={{ __html: formatted }}
                          />
                        )
                      })}
                    </div>

                    {/* Timestamp */}
                    <div
                      className={`mt-1 text-[10px] ${
                        msg.role === 'user' ? 'text-white/70 text-right' : 'text-slate-400 text-left'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Interactive Action Cards */}
                  {msg.actionCard && (
                    <div className="mt-2.5 w-full max-w-[88%]">
                      {/* 1. Confirm Booking Card */}
                      {msg.actionCard.type === 'CONFIRM_BOOKING' && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 shadow-sm">
                          <div className="flex items-center gap-2 mb-2 text-amber-900 font-extrabold text-xs">
                            <ShieldCheck className="h-4 w-4 text-amber-600" />
                            Upfront Booking Estimate Ready
                          </div>

                          <div className="bg-white rounded-xl p-3 border border-amber-100 shadow-xs mb-3 space-y-2">
                            {msg.actionCard.scheduledAt && (
                              <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  Appointment:
                                </span>
                                <span className="font-bold text-slate-900">
                                  {new Date(msg.actionCard.scheduledAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}

                            {msg.actionCard.estimate && (
                              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                                <span className="font-medium">Estimated Cost:</span>
                                <span className="font-extrabold text-orange-600 text-xs">
                                  ₹{msg.actionCard.estimate.min} – ₹{msg.actionCard.estimate.max}
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleConfirmActionCard(msg.actionCard)}
                            disabled={isConfirmingBooking}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isConfirmingBooking ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Confirming Booking…
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Confirm & Book Now
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              useAiStore.getState().setFocusedWorker({
                                workerId: msg.actionCard.workerId,
                                lat: msg.actionCard.lat || msg.actionCard.worker?.lat,
                                lng: msg.actionCard.lng || msg.actionCard.worker?.lng,
                                categoryId: msg.actionCard.categoryId,
                                worker: msg.actionCard.worker,
                                openDrawer: true,
                              })
                            }}
                            className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white py-2 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <span>View Portfolio & Reviews on Left 👈</span>
                          </button>
                        </div>
                      )}

                      {/* 2. Discovered Workers List Card */}
                      {msg.actionCard.type === 'WORKERS_LIST' && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-3.5 shadow-sm">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-1.5 text-orange-950 font-extrabold text-xs">
                              <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                              <span>Nearby Verified {msg.actionCard.categoryName || 'Pros'}</span>
                            </div>
                            <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                              {msg.actionCard.workers?.length || 0} found
                            </span>
                          </div>

                          <div className="space-y-2">
                            {msg.actionCard.workers?.map((w, idx) => (
                              <div
                                key={w.workerId || idx}
                                className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-orange-100 shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 font-black text-white text-xs shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800 truncate">
                                      <span className="truncate">{w.name}</span>
                                      <span className="text-amber-500 text-[10px]">
                                        ★ {Number(w.rating || 5).toFixed(1)}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                      {w.distanceKm ? `${w.distanceKm} km away` : ''} • from ₹{w.baseRate || 350}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    useAiStore.getState().setFocusedWorker({
                                      workerId: w.workerId,
                                      lat: w.lat,
                                      lng: w.lng,
                                      categoryId: msg.actionCard.categoryId,
                                      worker: w,
                                      openDrawer: true,
                                    })
                                  }}
                                  className="flex items-center gap-1 rounded-lg bg-orange-100/80 hover:bg-orange-200/90 px-2.5 py-1 text-[11px] font-bold text-orange-800 transition-colors shrink-0 cursor-pointer"
                                  title="Inspect portfolio on the left side"
                                >
                                  <span>View 👈</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Booking Created Success Card */}
                      {msg.actionCard.type === 'BOOKING_CREATED' && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 shadow-sm">
                          <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs mb-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Booking #{msg.actionCard.booking?.code || 'SUCCESS'} Created
                          </div>
                          <p className="text-[11px] text-emerald-700 mb-3">
                            Status: <span className="font-bold">PENDING</span> (Waiting for worker acceptance)
                          </p>
                          <button
                            onClick={() => {
                              setIsOpen(false)
                              navigate('/my-bookings')
                            }}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            <span>View in My Bookings</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2.5 text-slate-500 py-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200/80 px-3 py-2 text-xs text-slate-600 shadow-xs">
                    <span>Searching nearby workers & calculating pricing…</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="border-t border-slate-200/80 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="e.g. Find & book painter for tomorrow 12pm..."
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-40 cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  Privacy-first • Direct phone masking
                </span>
                <span>Press Enter ↵</span>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
