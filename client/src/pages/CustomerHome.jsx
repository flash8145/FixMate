import { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../services/api.js'
import { useAuthStore } from '../store/authStore.js'
import { useAiStore } from '../store/aiStore.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { useGeoLocation } from '../hooks/useGeoLocation.js'
import { reverseGeocode } from '../services/geocoding.js'

import MapView from '../components/map/MapView.jsx'
import WorkerDetailPanel from '../features/worker/WorkerDetailPanel.jsx'
import BookingModal from '../features/booking/BookingModal.jsx'
import { getServiceImage, getWorkerAvatar } from '../config/images.js'
import { cardHoverVariants } from '../utils/motion.js'
import {
  Search,
  MapPin,
  Crosshair,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  Pin,
  PinOff,
  Loader2,
} from 'lucide-react'

const DEFAULT_CENTER = [18.5204, 73.8567] // Pune fallback
const SEARCH_RADIUS_M = 25000

export default function CustomerHome() {
  const { getCurrentPosition } = useGeoLocation()
  const user = useAuthStore((s) => s.user)

  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)

  // Initial location: default to user's saved permanent address if available
  const initialPin =
    user?.address?.location?.coordinates?.length === 2 &&
    user.address.location.coordinates[1] &&
    user.address.location.coordinates[0]
      ? [user.address.location.coordinates[1], user.address.location.coordinates[0]]
      : DEFAULT_CENTER

  const [center, setCenter] = useState(initialPin)
  const [customerPin, setCustomerPin] = useState(initialPin)

  // Search & Google Maps-style suggestions
  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const debouncedCityQuery = useDebounce(cityQuery, 350)
  const searchContainerRef = useRef(null)

  // Unified hover state: controls BOTH the search expansion and the worker list visibility
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const hoverTimeoutRef = useRef(null)

  const [workers, setWorkers] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [selectedWorkerId, setSelectedWorkerId] = useState(null)
  const [highlightedWorkerId, setHighlightedWorkerId] = useState(null)
  const [bookingWorker, setBookingWorker] = useState(null)

  // Filters & sorting
  const [sortBy, setSortBy] = useState('nearest') // 'nearest' | 'rating' | 'jobs'
  const [minRatingFilter, setMinRatingFilter] = useState(0)
  const [availableOnlyFilter, setAvailableOnlyFilter] = useState(false)
  const [maxDistanceKm, setMaxDistanceKm] = useState(25)

  const debouncedCustomerPin = useDebounce(customerPin, 300)

  // Load categories
  useEffect(() => {
    api.get('/categories').then((res) => {
      setCategories(res.data.data)
      setActiveCategory(res.data.data[0]?._id ?? null)
    })
  }, [])

  // Sync with user's permanent address if updated
  useEffect(() => {
    if (
      user?.address?.location?.coordinates?.length === 2 &&
      user.address.location.coordinates[1] &&
      user.address.location.coordinates[0]
    ) {
      const saved = [user.address.location.coordinates[1], user.address.location.coordinates[0]]
      setCenter(saved)
      setCustomerPin(saved)
    }
  }, [user])

  // Reverse-geocode the current map pin so the AI Assistant knows the exact pinned city & area
  useEffect(() => {
    if (!debouncedCustomerPin?.[0] || !debouncedCustomerPin?.[1]) return

    let cancelled = false
    reverseGeocode(debouncedCustomerPin[0], debouncedCustomerPin[1]).then((geo) => {
      if (cancelled) return
      const pinCity = geo.city || cityQuery || 'Current Area'
      const pinArea = geo.area || geo.line || 'Pinned Location'
      const pinLabel = [pinArea, pinCity].filter(Boolean).join(', ')

      useAiStore.getState().setPinnedLocation({
        lat: debouncedCustomerPin[0],
        lng: debouncedCustomerPin[1],
        city: pinCity,
        area: pinArea,
        label: pinLabel,
        displayName: geo.display_name || pinLabel,
        source: 'pinned',
      })
    })

    return () => {
      cancelled = true
    }
  }, [debouncedCustomerPin, cityQuery])

  // React to AI Agent worker discovery: smoothly pan map to the recommended professional and highlight their pin!
  const focusedWorker = useAiStore((s) => s.focusedWorker)
  useEffect(() => {
    if (focusedWorker?.lat && focusedWorker?.lng) {
      // 1. Cinematic map fly to the found professional!
      setCenter([focusedWorker.lat, focusedWorker.lng])

      // 2. Highlight their pin on the map
      if (focusedWorker.workerId) {
        setHighlightedWorkerId(focusedWorker.workerId.toString())
      }

      // 3. Open the portfolio drawer on the left if explicitly requested (e.g. from chat button)
      if (focusedWorker.openDrawer && focusedWorker.workerId) {
        setSelectedWorkerId(focusedWorker.workerId.toString())
      }

      // 4. Switch active category if needed so the marker is visible
      if (focusedWorker.categoryId && focusedWorker.categoryId !== activeCategory) {
        setActiveCategory(focusedWorker.categoryId)
      }
    }
  }, [focusedWorker, activeCategory])

  // Query workers whenever customerPin or active category changes
  useEffect(() => {
    if (!activeCategory) return
    setIsSearching(true)
    setSearchError('')
    api
      .get('/workers/search', {
        params: {
          lat: debouncedCustomerPin[0],
          lng: debouncedCustomerPin[1],
          categoryId: activeCategory,
        },
      })
      .then((res) => setWorkers(res.data.data))
      .catch(() =>
        setSearchError('Could not load workers. Please verify that the backend server is running.'),
      )
      .finally(() => setIsSearching(false))
  }, [debouncedCustomerPin, activeCategory])

  // Google Maps-style Nominatim search with addressdetails
  useEffect(() => {
    if (!debouncedCityQuery || debouncedCityQuery.trim().length < 2) {
      setCitySuggestions([])
      setIsSearchingPlaces(false)
      return
    }

    const controller = new AbortController()
    setIsSearchingPlaces(true)

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(
        debouncedCityQuery.trim(),
      )}`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
        },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setCitySuggestions([])
          return
        }
        const formatted = data.map((place) => {
          const addr = place.address || {}
          const primary =
            place.name ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.city ||
            addr.town ||
            addr.village ||
            (place.display_name || '').split(',')[0].trim() ||
            'Location'

          const secondaryParts = [
            addr.suburb && addr.suburb !== primary ? addr.suburb : null,
            addr.city || addr.town || addr.district,
            addr.state,
            addr.postcode,
          ].filter(Boolean)

          const secondary =
            secondaryParts.length > 0
              ? Array.from(new Set(secondaryParts)).join(', ')
              : (place.display_name || '').split(',').slice(1, 4).join(', ').trim()

          return {
            ...place,
            primaryName: primary,
            secondaryText: secondary || 'India',
          }
        })
        setCitySuggestions(formatted)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Nominatim error', err)
        }
      })
      .finally(() => {
        setIsSearchingPlaces(false)
      })

    return () => controller.abort()
  }, [debouncedCityQuery])

  // Dismiss suggestions & search focus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setCitySuggestions([])
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  const selectCity = (place) => {
    const coords = [Number(place.lat), Number(place.lon)]
    setCenter(coords)
    setCustomerPin(coords)
    const label = place.primaryName || place.display_name.split(',')[0]
    const cityName = place.address?.city || place.address?.town || place.address?.village || label
    setCityQuery(label)
    setCitySuggestions([])
    setIsSearchFocused(false)

    useAiStore.getState().setPinnedLocation({
      lat: coords[0],
      lng: coords[1],
      city: cityName,
      area: label,
      label: place.display_name || `${label}, ${cityName}`,
      displayName: place.display_name || `${label}, ${cityName}`,
      source: 'pinned',
    })
  }

  const handleUseMyLocation = async () => {
    try {
      const { lat, lng } = await getCurrentPosition()
      setCenter([lat, lng])
      setCustomerPin([lat, lng])
      setCityQuery('')
      setCitySuggestions([])
    } catch {
      setSearchError('Could not detect your GPS location. You can search your city/area above.')
    }
  }

  // Unified hover handlers with smooth buffer to prevent any flicker
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 350)
  }

  // Expanded condition: unified for both search growth and worker list card
  const isExpanded = isPinned || isHovered || isSearchFocused || citySuggestions.length > 0

  // Find active category item
  const activeCategoryObj = useMemo(() => {
    return categories.find((c) => c._id === activeCategory)
  }, [categories, activeCategory])

  // Filter and sort workers client-side
  const filteredWorkers = useMemo(() => {
    let list = [...workers]
    if (
      focusedWorker?.worker &&
      focusedWorker.worker.lat &&
      focusedWorker.worker.lng &&
      !list.some(
        (w) =>
          (w.workerId || w._id)?.toString() ===
          (focusedWorker.workerId || focusedWorker.worker.workerId || focusedWorker.worker._id)?.toString(),
      )
    ) {
      list.push(focusedWorker.worker)
    }

    return list
      .filter((w) => {
        if (minRatingFilter > 0 && (w.rating || 0) < minRatingFilter) return false
        if (availableOnlyFilter && w.isAvailable === false) return false
        if (w.distanceM && w.distanceM / 1000 > maxDistanceKm) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
        if (sortBy === 'jobs') return (b.jobsCompleted || 0) - (a.jobsCompleted || 0)
        return (a.distanceM || 0) - (b.distanceM || 0)
      })
  }, [workers, minRatingFilter, availableOnlyFilter, maxDistanceKm, sortBy, focusedWorker])

  // When a worker is clicked, pan map to worker
  const handleSelectWorker = (workerId) => {
    if (!workerId) return
    const idStr = workerId.toString()
    setSelectedWorkerId(idStr)
    setHighlightedWorkerId(idStr)
    const target =
      workers.find((w) => (w.workerId || w._id)?.toString() === idStr) ||
      (focusedWorker?.worker &&
      (focusedWorker.workerId || focusedWorker.worker.workerId || focusedWorker.worker._id)?.toString() === idStr
        ? focusedWorker.worker
        : null)
    if (target && target.lat && target.lng) {
      setCenter([target.lat, target.lng])
    }
  }

  const selectedWorkerObj = useMemo(() => {
    if (!selectedWorkerId) return null
    return (
      workers.find((w) => (w.workerId || w._id)?.toString() === selectedWorkerId.toString()) ||
      (focusedWorker?.worker &&
      (focusedWorker.workerId || focusedWorker.worker.workerId || focusedWorker.worker._id)?.toString() ===
        selectedWorkerId.toString()
        ? focusedWorker.worker
        : null)
    )
  }, [workers, selectedWorkerId, focusedWorker])

  return (
    <div className="relative min-h-[calc(100vh-61px)] w-full overflow-hidden bg-slate-100 flex flex-col">
      {/* Background Interactive Leaflet Map (Full Primary Canvas) */}
      <div className="absolute inset-0 z-0">
        <MapView
          center={center}
          customerPin={customerPin}
          radiusM={SEARCH_RADIUS_M}
          workers={filteredWorkers}
          selectedWorkerId={selectedWorkerId}
          highlightedWorkerId={highlightedWorkerId}
          onPinMove={(lat, lng) => {
            setCenter([lat, lng])
            setCustomerPin([lat, lng])
          }}
          onWorkerSelect={handleSelectWorker}
        />
      </div>

      {/* Floating Top Controls & Connected Workers List */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 sm:px-6 pt-3 pointer-events-none flex flex-col items-start">
        {/* Persistent Search Card: morphs smoothly from small to big with NO disappearing */}
        <motion.div
          layout
          transition={{
            type: 'spring',
            damping: 28,
            stiffness: 280,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`mx-auto pointer-events-auto glass-panel border border-white/85 shadow-2xl relative transition-all duration-300 ${
            isExpanded
              ? 'w-full max-w-7xl rounded-3xl p-4 sm:p-5'
              : 'w-full max-w-2xl rounded-full p-1.5 sm:p-2'
          }`}
        >
          {/* Header Title & Controls: smoothly animates in above the search row when expanded */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="header-title-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Find Trusted{' '}
                      <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                        Local Professionals
                      </span>
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Home services, made simple. Search, compare and book verified technicians near you.
                    </p>
                  </div>

                  {/* Pin and Collapse buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsPinned((p) => !p)}
                      title={isPinned ? 'Unpin (auto-collapse when mouse leaves)' : 'Pin header & workers open'}
                      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
                        isPinned
                          ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                          : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isPinned ? 'Pinned' : 'Pin'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPinned(false)
                        setIsHovered(false)
                        setIsSearchFocused(false)
                      }}
                      title="Minimize to compact bar"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Row: Always present in DOM, smoothly expanding input & controls */}
          <div ref={searchContainerRef} className="relative flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 shrink-0 pointer-events-none" />

              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onFocus={() => {
                  setIsSearchFocused(true)
                  setIsHovered(true)
                }}
                placeholder="Search city, area or street address (e.g. Ahmedabad, Navrangpura, Pune)..."
                className={`w-full font-semibold text-slate-900 outline-none transition-all ${
                  isExpanded
                    ? 'rounded-2xl border border-slate-200 bg-white/95 py-3 pl-11 pr-20 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs'
                    : 'bg-transparent py-1.5 pl-10 pr-16 text-xs sm:text-sm placeholder:text-slate-400'
                }`}
              />

              {/* Input Right Icons */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isSearchingPlaces && (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                )}
                {cityQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCityQuery('')
                      setCitySuggestions([])
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Google Maps Exact Dropdown Suggestions */}
              {citySuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 backdrop-blur-xl p-2 shadow-2xl ring-1 ring-black/5 max-h-72 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Suggested Locations
                  </div>
                  {citySuggestions.map((place) => (
                    <button
                      key={place.place_id}
                      type="button"
                      onClick={() => selectCity(place)}
                      className="group flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-orange-50 cursor-pointer"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-orange-700 transition-colors truncate">
                          {place.primaryName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {place.secondaryText}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* When Small: Compact Category Badge + Quick GPS + Expand hint */}
            {!isExpanded && (
              <div className="flex items-center gap-2 shrink-0">
                {activeCategoryObj && (
                  <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200/90 px-3 py-1 text-xs font-bold text-orange-700 shrink-0 shadow-xs">
                    <span>{activeCategoryObj.icon || '🛠️'}</span>
                    <span>{activeCategoryObj.name}</span>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUseMyLocation()
                  }}
                  type="button"
                  title="Use my current GPS location"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>

                <div className="hidden md:flex items-center gap-1 text-[11px] font-bold text-slate-400 px-1">
                  <span>Expand</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            )}

            {/* When Expanded: Full "Use my location" button & AI Concierge trigger */}
            {isExpanded && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleUseMyLocation}
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 active:scale-98 transition-all cursor-pointer"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>Use my location</span>
                </button>
                <button
                  onClick={() => useAiStore.getState().open()}
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-4 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 active:scale-98 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>AI Concierge</span>
                </button>
              </div>
            )}
          </div>

          {/* Photographic Service Categories Row: smoothly unfolds below search input when expanded */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="header-categories-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-3.5 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => {
                    const isSelected = activeCategory === cat._id
                    const catImage = getServiceImage(cat.name)

                    return (
                      <button
                        key={cat._id}
                        onClick={() => setActiveCategory(cat._id)}
                        className={`group relative flex items-center gap-2.5 rounded-2xl p-1.5 pr-4 border transition-all duration-200 cursor-pointer shrink-0 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 shadow-md shadow-orange-500/10'
                            : 'border-slate-200/80 bg-white/90 hover:border-slate-300 hover:bg-white shadow-xs'
                        }`}
                      >
                        <div className="relative h-9 w-9 rounded-xl overflow-hidden shrink-0">
                          <img
                            src={catImage}
                            alt={cat.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                          <span className="absolute inset-0 flex items-center justify-center text-xs">
                            {cat.icon || '🛠️'}
                          </span>
                        </div>

                        <span
                          className={`text-xs font-bold whitespace-nowrap ${
                            isSelected ? 'text-orange-700' : 'text-slate-700'
                          }`}
                        >
                          {cat.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Floating Workers List Card: Appears only with search hover/expanded state without separate pill on map */}
        <AnimatePresence initial={false}>
          {isExpanded && citySuggestions.length === 0 && (
            <motion.div
              key="worker-list-floating"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="pointer-events-auto mt-3 w-full md:w-84 lg:w-96 max-h-[calc(100vh-320px)] flex flex-col glass-panel rounded-3xl p-4 border border-white/80 shadow-2xl overflow-hidden"
            >
              {/* Results Header with Sorting */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <span className="text-xs font-extrabold text-slate-900">
                    {isSearching
                      ? 'Searching nearby…'
                      : `${filteredWorkers.length} workers found`}
                  </span>
                  <p className="text-[10px] text-slate-400">Within {maxDistanceKm} km of selected pin</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 outline-none border border-slate-200 cursor-pointer"
                  >
                    <option value="nearest">Nearest</option>
                    <option value="rating">Top Rated</option>
                    <option value="jobs">Experience</option>
                  </select>
                </div>
              </div>

              {searchError && (
                <div className="my-2 rounded-xl bg-rose-50 p-2.5 text-xs font-medium text-rose-600">
                  {searchError}
                </div>
              )}

              {/* Workers Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
                {isSearching ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto mb-2" />
                    Locating verified workers…
                  </div>
                ) : filteredWorkers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                    <p className="font-semibold text-slate-600">No workers in this zone</p>
                    <p className="mt-1 text-slate-400">
                      Try panning the map or picking another category above.
                    </p>
                  </div>
                ) : (
                  filteredWorkers.map((w) => {
                    const wId = w.workerId || w._id
                    const isSelected = selectedWorkerId === wId
                    const avatar = w.avatarUrl || w.avatar || getWorkerAvatar(wId)

                    return (
                      <motion.div
                        key={wId}
                        variants={cardHoverVariants}
                        initial="initial"
                        whileHover="hover"
                        onClick={() => handleSelectWorker(wId)}
                        className={`group relative rounded-2xl p-3 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20 shadow-md'
                            : 'border-slate-200/80 bg-white/95 hover:border-orange-400/80 hover:bg-white shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Worker Avatar with online status */}
                          <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                            <img
                              src={avatar}
                              alt={w.name}
                              className="h-full w-full object-cover"
                            />
                            {w.isAvailable !== false && (
                              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                            )}
                          </div>

                          {/* Name & Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h3 className="font-extrabold text-sm text-slate-900 truncate">
                                {w.name}
                              </h3>
                              <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60 shrink-0">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {w.rating ? Number(w.rating).toFixed(1) : 'New'}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="text-slate-500 font-medium">
                                {(w.distanceM / 1000).toFixed(1)} km away
                              </span>
                              <span className="font-black text-orange-600">
                                from ₹{w.minRate}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Floating Bar: Quick Filter Pills */}
      <div className="mt-auto relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 pb-4 pointer-events-none">
        <div className="flex items-center justify-end gap-3 pt-2">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pointer-events-auto">
            <button
              onClick={() =>
                setMaxDistanceKm((d) => (d === 25 ? 10 : d === 10 ? 5 : 25))
              }
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                maxDistanceKm < 25
                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                  : 'bg-white/90 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Within {maxDistanceKm} km
            </button>

            <button
              onClick={() => setMinRatingFilter((r) => (r === 0 ? 4 : 0))}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                minRatingFilter === 4
                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                  : 'bg-white/90 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              Rating 4+
            </button>

            <button
              onClick={() => setAvailableOnlyFilter((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                availableOnlyFilter
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-white/90 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Available now
            </button>
          </div>
        </div>
      </div>

      {/* Worker Detail Side Drawer */}
      {selectedWorkerId && (
        <WorkerDetailPanel
          workerId={selectedWorkerId}
          onClose={() => setSelectedWorkerId(null)}
          onBook={(worker) => {
            setSelectedWorkerId(null)
            setBookingWorker(worker)
          }}
          customerLocation={customerPin}
          workerDistanceM={selectedWorkerObj?.distanceM}
        />
      )}

      {/* Booking Modal Flow */}
      {bookingWorker && (
        <BookingModal
          worker={bookingWorker}
          activeCategoryId={activeCategory}
          customerLocation={customerPin}
          onClose={() => setBookingWorker(null)}
          onSuccess={() => {
            // Keep modal open on success confirmation state
          }}
        />
      )}
    </div>
  )
}
