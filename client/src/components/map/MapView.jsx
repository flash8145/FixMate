import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { userLocationIcon } from './icons.js'
import WorkerMarker from './WorkerMarker.jsx'
import RadiusCircle from './RadiusCircle.jsx'

function RecenterOnChange({ center }) {
  const map = useMap()
  const [lat, lng] = center
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], map.getZoom() || 13, {
        duration: 1.2,
        easeLinearity: 0.25,
      })
    }
  }, [lat, lng, map])
  return null
}

function ClickToMove({ onMove }) {
  useMapEvents({
    click(e) {
      const target = e.originalEvent?.target
      if (
        target &&
        target.closest(
          '.leaflet-marker-icon, .custom-worker-pin, .user-location-marker, .worker-location-marker, .leaflet-popup, .leaflet-tooltip, .worker-tooltip, [role="tooltip"]',
        )
      ) {
        return
      }
      onMove(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function MapView({
  center,
  customerPin = null,
  radiusM,
  workers = [],
  selectedWorkerId = null,
  highlightedWorkerId = null,
  onPinMove,
  onWorkerSelect,
}) {
  const pinPosition = customerPin || center

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl={false} // Custom zoom controls can be used or default positioned
      >
        {/* Modern clean OpenStreetMap tiles with high clarity */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterOnChange center={center} />
        <ClickToMove onMove={onPinMove} />
        {radiusM && <RadiusCircle center={pinPosition} radiusM={radiusM} />}

        {/* User Draggable Location Marker */}
        <Marker
          position={pinPosition}
          icon={userLocationIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng()
              onPinMove(lat, lng)
            },
          }}
        />

        {/* Available Workers on Map */}
        {workers.map((w) => {
          const wId = (w.workerId || w._id)?.toString()
          const isSelected =
            selectedWorkerId?.toString() === wId ||
            highlightedWorkerId?.toString() === wId
          return (
            <WorkerMarker
              key={wId}
              worker={w}
              isSelected={isSelected}
              onSelect={onWorkerSelect}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}
