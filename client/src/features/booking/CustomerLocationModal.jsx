import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { userLocationIcon, workerLocationIcon } from '../../components/map/icons.js'
import { AVATAR_PRESETS } from '../../config/images.js'
import {
  X,
  MapPin,
  ExternalLink,
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  ShieldCheck,
  Navigation,
  Route as RouteIcon,
  Car,
  Compass,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

function calculateDistKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
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

function MapAutoFit({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions && positions.length > 1) {
      map.fitBounds(positions, { padding: [35, 35], maxZoom: 16 })
    }
  }, [map, positions])
  return null
}

export default function CustomerLocationModal({
  isOpen,
  booking,
  workerLocation,
  onClose,
}) {
  const [routeData, setRouteData] = useState(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [showSteps, setShowSteps] = useState(false)
  const [gpsOrigin, setGpsOrigin] = useState(null)
  const [useLiveGps, setUseLiveGps] = useState(false)

  const customer = booking?.customerId
  const address = booking?.address
  const coords = address?.location?.coordinates // [lng, lat]
  const custLat = coords?.[1] || 18.5204
  const custLng = coords?.[0] || 73.8567

  const workerCoords = workerLocation?.coordinates // [lng, lat]
  const workLat = useLiveGps && gpsOrigin ? gpsOrigin.lat : (workerCoords?.[1] || 18.5204)
  const workLng = useLiveGps && gpsOrigin ? gpsOrigin.lng : (workerCoords?.[0] || 73.8567)

  const distanceKm =
    workLat && workLng ? calculateDistKm(workLat, workLng, custLat, custLng) : null

  const isAccepted = ['ACCEPTED', 'IN_PROGRESS', 'PRICE_SET', 'COMPLETED'].includes(
    booking?.status,
  )

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}`

  // Fetch in-app driving directions without leaving the app
  const fetchDrivingDirections = useCallback(async (startLat = workLat, startLng = workLng) => {
    if (!startLat || !startLng || !custLat || !custLng) {
      setRouteError('Start or destination coordinates missing.')
      return
    }

    setIsLoadingRoute(true)
    setRouteError('')

    try {
      // OSRM Driving routing engine
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${custLng},${custLat}?overview=full&geometries=geojson&steps=true`
      const res = await fetch(url)
      const data = await res.json()

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        // GeoJSON coordinates are [lng, lat] -> convert to Leaflet [lat, lng]
        const latLngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        const distanceKm = (route.distance / 1000).toFixed(1)
        const durationMins = Math.max(1, Math.round(route.duration / 60))
        const steps = route.legs?.[0]?.steps || []

        setRouteData({
          coordinates: latLngs,
          distanceKm,
          durationMins,
          steps,
        })
      } else {
        setRouteError('Could not calculate driving route between these points.')
      }
    } catch {
      setRouteError('Failed to reach routing service. Please try again.')
    } finally {
      setIsLoadingRoute(false)
    }
  }, [workLat, workLng, custLat, custLng])

  const handleToggleLiveGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }

    if (!useLiveGps) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setGpsOrigin({ lat, lng })
          setUseLiveGps(true)
          fetchDrivingDirections(lat, lng)
        },
        () => {
          alert('Could not retrieve current GPS position. Using base workshop location.')
        },
      )
    } else {
      setUseLiveGps(false)
      fetchDrivingDirections(workerCoords?.[1] || 18.5204, workerCoords?.[0] || 73.8567)
    }
  }

  // Pre-load route if worker location is available and modal opens
  useEffect(() => {
    if (isOpen && booking && workLat && workLng && custLat && custLng) {
      fetchDrivingDirections(workLat, workLng)
    }
  }, [isOpen, booking, workLat, workLng, custLat, custLng, fetchDrivingDirections])

  if (!isOpen || !booking) return null

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 font-extrabold">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Customer Profile & Live Navigation
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Booking #{booking.code} · {booking.categoryId?.name || 'Service'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 hover:text-slate-700 shadow-xs border border-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Customer Profile Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-orange-500/20 shadow-xs bg-slate-100 shrink-0">
                  <img
                    src={customer?.avatarUrl || AVATAR_PRESETS[0]}
                    alt={customer?.name || 'Customer'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {customer?.name || 'Local Resident'}
                  </h4>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">
                    {customer?.email || 'Verified FixMate Member'}
                  </p>
                </div>
              </div>

              {/* Contact Information with Privacy Gating */}
              {isAccepted ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-xl bg-white border border-emerald-200 px-3 py-1.5 text-xs text-emerald-800 font-bold flex items-center gap-1.5 shadow-xs">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{booking.customerPhone || customer?.phone || 'Available'}</span>
                  </div>
                  {booking.whatsAppUrl && (
                    <a
                      href={booking.whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Phone unlocked upon job acceptance</span>
                </div>
              )}
            </div>

            {/* Problem & Time Details */}
            <div className="border-t border-slate-200/60 pt-2.5 text-xs space-y-1.5">
              <p className="text-slate-700">
                <strong className="text-slate-900">Issue:</strong> "{booking.problemText}"
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Scheduled: {new Date(booking.scheduledAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Urgency: <strong className="text-orange-600">{booking.urgency}</strong>
                </span>
                {distanceKm && (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Navigation className="w-3 h-3" />
                    ~{distanceKm} km from base
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* In-App Route & Direction Controls Bar */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {address?.line || 'Customer Destination'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {address?.area ? `${address.area}, ` : ''}{address?.city || 'Pune'} {address?.pincode ? `- ${address.pincode}` : ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchDrivingDirections()}
                  disabled={isLoadingRoute}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-1.5 text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {isLoadingRoute ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RouteIcon className="w-3.5 h-3.5" />
                  )}
                  <span>{isLoadingRoute ? 'Calculating Route…' : 'Get Directions on Map'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleLiveGps}
                  className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                    useLiveGps
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Toggle between workshop base and current live GPS"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{useLiveGps ? 'Using Live GPS' : 'Use Base'}</span>
                </button>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1.5 text-xs font-bold transition-colors shrink-0"
                  title="Open external Google Maps App if voice navigation is needed"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>

            {/* In-Map Driving Route Stat Pills */}
            {routeData && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/70">
                    <Car className="w-4 h-4 text-blue-600" />
                    <span>Driving: {routeData.distanceKm} km</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>~{routeData.durationMins} min travel</span>
                  </div>
                </div>

                {routeData.steps?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSteps(!showSteps)}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    <span>{showSteps ? 'Hide Step Turns' : 'View Turn By Turn'}</span>
                    {showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>
            )}

            {routeError && (
              <p className="text-xs text-rose-600 font-semibold pt-1">{routeError}</p>
            )}

            {/* Turn-by-Turn step list expandable */}
            {showSteps && routeData?.steps && (
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-[11px] text-slate-700">
                {routeData.steps.map((st, i) => (
                  <div key={i} className="flex items-start gap-1.5 py-0.5 border-b border-slate-200/50 last:border-none">
                    <span className="font-bold text-blue-600 shrink-0">{i + 1}.</span>
                    <span className="flex-1">
                      {st.maneuver?.type === 'depart'
                        ? 'Depart onto ' + (st.name || 'road')
                        : st.maneuver?.type === 'arrive'
                        ? 'Arrive at customer destination'
                        : `${st.maneuver?.modifier ? st.maneuver.modifier + ' onto ' : ''}${st.name || 'road'}`}
                    </span>
                    <span className="font-mono text-slate-400 shrink-0">
                      {st.distance > 1000 ? `${(st.distance / 1000).toFixed(1)} km` : `${Math.round(st.distance)} m`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Leaflet Map with Driving Route */}
          <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
            <MapContainer
              center={[custLat, custLng]}
              zoom={13}
              className="h-full w-full"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Auto-fit map to route bounds when calculated */}
              {routeData?.coordinates && routeData.coordinates.length > 1 ? (
                <MapAutoFit positions={routeData.coordinates} />
              ) : (
                <MapAutoFit
                  positions={[
                    [workLat, workLng],
                    [custLat, custLng],
                  ]}
                />
              )}

              {/* Customer Booking Location Marker */}
              <Marker position={[custLat, custLng]} icon={userLocationIcon}>
                <Popup>
                  <div className="text-xs font-bold">
                    <p className="text-orange-600">{customer?.name || 'Customer'}'s Destination</p>
                    <p className="text-slate-600 font-normal">{address?.line}, {address?.city}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Worker Location Marker */}
              {workLat && workLng && (
                <Marker position={[workLat, workLng]} icon={workerLocationIcon}>
                  <Popup>
                    <div className="text-xs font-bold text-slate-800">
                      {useLiveGps ? 'Your Live GPS Location' : 'Your Base Workshop'}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Real Road Driving Route Polyline */}
              {routeData?.coordinates && routeData.coordinates.length > 0 ? (
                <>
                  {/* Subtle glow border */}
                  <Polyline
                    positions={routeData.coordinates}
                    pathOptions={{ color: '#60a5fa', weight: 8, opacity: 0.5 }}
                  />
                  {/* Crisp route stroke */}
                  <Polyline
                    positions={routeData.coordinates}
                    pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.95 }}
                  />
                </>
              ) : (
                /* Fallback straight dotted line if routing hasn't finished yet */
                workLat && workLng && (
                  <Polyline
                    positions={[
                      [workLat, workLng],
                      [custLat, custLng],
                    ]}
                    color="#f97316"
                    dashArray="6, 8"
                    weight={3}
                  />
                )
              )}
            </MapContainer>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-medium">
            Road routing powered by OpenStreetMap & OSRM Engine
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
