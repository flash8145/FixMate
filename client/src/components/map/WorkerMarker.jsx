import { useEffect, useRef, useMemo } from 'react'
import { Marker, Tooltip } from 'react-leaflet'
import { createWorkerIcon } from './icons.js'
import { Star, ShieldCheck, ChevronRight } from 'lucide-react'

export default function WorkerMarker({ worker, onSelect, isSelected = false }) {
  const markerRef = useRef(null)
  const tooltipContentRef = useRef(null)
  const workerId = (worker.workerId || worker._id)?.toString()

  // Memoize icon so DOM nodes are not re-created on each render
  const icon = useMemo(
    () => createWorkerIcon(worker, isSelected),
    [worker.workerId, worker._id, worker.avatarUrl, worker.avatar, worker.isAvailable, isSelected],
  )

  const handleSelect = (e) => {
    if (e) {
      try {
        if (e.originalEvent?.stopPropagation) e.originalEvent.stopPropagation()
        if (e.originalEvent?.preventDefault) e.originalEvent.preventDefault()
        if (e.stopPropagation) e.stopPropagation()
        if (e.preventDefault) e.preventDefault()
      } catch {
        // safe fallback
      }
    }
    if (workerId && onSelect) {
      onSelect(workerId)
    }
  }

  // Bind direct DOM event listeners to the marker element (useCapture = true)
  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    // Leaflet marker event
    marker.on('click', handleSelect)

    const el = marker.getElement()
    if (el) {
      el.addEventListener('click', handleSelect, true)
      el.addEventListener('pointerdown', handleSelect, true)
      el.addEventListener('touchend', handleSelect, true)
    }

    return () => {
      marker.off('click', handleSelect)
      if (el) {
        el.removeEventListener('click', handleSelect, true)
        el.removeEventListener('pointerdown', handleSelect, true)
        el.removeEventListener('touchend', handleSelect, true)
      }
    }
  }, [workerId, onSelect])

  // Bind direct capture listeners to the tooltip DOM element
  useEffect(() => {
    const content = tooltipContentRef.current
    if (!content) return

    content.addEventListener('click', handleSelect, true)
    content.addEventListener('mousedown', handleSelect, true)
    content.addEventListener('pointerdown', handleSelect, true)
    content.addEventListener('touchend', handleSelect, true)

    const tooltipEl = content.closest('.leaflet-tooltip')
    if (tooltipEl) {
      tooltipEl.addEventListener('click', handleSelect, true)
      tooltipEl.addEventListener('mousedown', handleSelect, true)
      tooltipEl.addEventListener('pointerdown', handleSelect, true)
      tooltipEl.addEventListener('touchend', handleSelect, true)
    }

    return () => {
      content.removeEventListener('click', handleSelect, true)
      content.removeEventListener('mousedown', handleSelect, true)
      content.removeEventListener('pointerdown', handleSelect, true)
      content.removeEventListener('touchend', handleSelect, true)
      if (tooltipEl) {
        tooltipEl.removeEventListener('click', handleSelect, true)
        tooltipEl.removeEventListener('mousedown', handleSelect, true)
        tooltipEl.removeEventListener('pointerdown', handleSelect, true)
        tooltipEl.removeEventListener('touchend', handleSelect, true)
      }
    }
  })

  return (
    <Marker
      ref={markerRef}
      position={[worker.lat, worker.lng]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 100}
      eventHandlers={{
        click: handleSelect,
        mousedown: handleSelect,
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, -46]}
        opacity={1}
        interactive
        className="worker-tooltip cursor-pointer"
        eventHandlers={{
          click: handleSelect,
          mousedown: handleSelect,
        }}
      >
        <div
          ref={tooltipContentRef}
          onClick={handleSelect}
          onMouseDown={handleSelect}
          onTouchStart={handleSelect}
          className="min-w-[190px] p-0.5 cursor-pointer select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-extrabold text-slate-900 text-xs truncate flex items-center gap-1">
              {worker.name}
              {worker.isVerified !== false && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              )}
            </h4>
            <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/50 shrink-0">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              {worker.rating ? Number(worker.rating).toFixed(1) : 'New'}
            </span>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              {worker.distanceM != null ? `${(worker.distanceM / 1000).toFixed(1)} km away` : 'Nearby'}
            </span>
            <span className="font-bold text-orange-600">
              {worker.minRate ? `from ₹${worker.minRate}` : ''}
            </span>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-orange-600 hover:text-orange-700">
            <span>Click to view profile & book</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </Tooltip>
    </Marker>
  )
}
