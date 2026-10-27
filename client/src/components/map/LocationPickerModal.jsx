import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { userLocationIcon } from './icons.js'
import { X, MapPin, Check, Search, Navigation, Loader2 } from 'lucide-react'
import { reverseGeocode } from '../../services/geocoding.js'
import { useDebounce } from '../../hooks/useDebounce.js'

function MapEvents({ onLocationChange }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RecenterMap({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.flyTo(position, 14, { duration: 0.6 })
    }
  }, [position, map])
  return null
}

export default function LocationPickerModal({
  isOpen,
  initialPosition = [18.5204, 73.8567],
  onClose,
  onSelectLocation,
}) {
  const [position, setPosition] = useState(initialPosition)
  const [addressDetails, setAddressDetails] = useState(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 350)

  useEffect(() => {
    if (isOpen) {
      const pos = [Number(initialPosition[0]) || 18.5204, Number(initialPosition[1]) || 73.8567]
      setPosition(pos)
      fetchAddress(pos[0], pos[1])
    }
  }, [isOpen, initialPosition])

  // Live accurate India-scoped location search as user types
  useEffect(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.trim().length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    setSearching(true)

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(
        debouncedSearchQuery.trim(),
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
          setSearchResults([])
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
        setSearchResults(formatted)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setSearchResults([])
        }
      })
      .finally(() => {
        setSearching(false)
      })

    return () => controller.abort()
  }, [debouncedSearchQuery])

  const fetchAddress = async (lat, lng) => {
    setIsGeocoding(true)
    const result = await reverseGeocode(lat, lng)
    setAddressDetails(result)
    setIsGeocoding(false)
  }

  const handleMapClick = (lat, lng) => {
    setPosition([lat, lng])
    fetchAddress(lat, lng)
  }

  const handleSelectSearchResult = (result) => {
    const lat = Number(result.lat)
    const lon = Number(result.lon)
    setPosition([lat, lon])
    setSearchResults([])
    setSearchQuery(result.primaryName || result.display_name.split(',')[0])
    fetchAddress(lat, lon)
  }

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setPosition([lat, lon])
        fetchAddress(lat, lon)
      },
      () => alert('Unable to retrieve your location'),
    )
  }

  const handleConfirm = () => {
    if (addressDetails) {
      onSelectLocation(addressDetails)
    } else {
      onSelectLocation({
        line: 'Selected Location',
        area: '',
        city: 'Pune',
        pincode: '',
        lat: position[0],
        lng: position[1],
      })
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Pick Location on Map</h3>
              <p className="text-[11px] text-slate-500">
                Click anywhere on the map to set address automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 hover:text-slate-700 shadow-xs border border-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar + GPS button */}
        <div className="p-3 border-b border-slate-100 bg-white relative z-[1500] space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Type city, area, locality (e.g. Pune, Kothrud, Ahmedabad)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              {searching ? (
                <Loader2 className="w-3.5 h-3.5 absolute right-3 top-2.5 animate-spin text-orange-500" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleUseGPS}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
              title="Use current GPS"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My GPS</span>
            </button>
          </div>

          {/* Autocomplete dropdown (Always on top of map canvas) */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden z-[2000] max-h-60 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                Suggested Locations in India
              </div>
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2.5 hover:bg-orange-50 text-xs text-slate-700 border-b border-slate-50 flex items-start gap-2.5 cursor-pointer transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {item.primaryName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.secondaryText}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative z-0 h-72 sm:h-80 w-full">
          <MapContainer
            center={position}
            zoom={14}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap position={position} />
            <MapEvents onLocationChange={handleMapClick} />
            <Marker position={position} icon={userLocationIcon} />
          </MapContainer>

          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600 shadow-xs z-[1000] border border-slate-200">
            Click map to reposition pin
          </div>
        </div>

        {/* Selected Address Preview */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
              <Check className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800">
                {isGeocoding ? 'Detecting address details...' : addressDetails?.line || 'Pinned Location'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {addressDetails?.area ? `${addressDetails.area}, ` : ''}
                {addressDetails?.city || 'Pune'} {addressDetails?.pincode ? `- ${addressDetails.pincode}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isGeocoding}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use This Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
