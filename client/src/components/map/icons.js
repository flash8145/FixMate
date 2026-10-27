import L from 'leaflet'
import { getWorkerAvatar } from '../../config/images.js'

export const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,0.3);animation:radar-pulse-blue 2s infinite;"></div>
      <div style="position:relative;width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export function createWorkerIcon(worker, isSelected = false) {
  const avatar = worker.avatarUrl || worker.userId?.avatarUrl || getWorkerAvatar(worker.workerId || worker._id)
  const isAvailable = worker.isAvailable !== false
  const borderColor = isSelected ? '#ea580c' : '#0284c7'
  const shadow = isSelected
    ? '0 0 0 3px rgba(249,115,22,0.4), 0 8px 16px rgba(0,0,0,0.3)'
    : '0 4px 12px rgba(0,0,0,0.25)'
  const scale = isSelected ? 'scale(1.15)' : 'scale(1)'
  const pulseClass = isSelected ? 'radar-pulse-orange' : ''

  return L.divIcon({
    className: 'custom-worker-pin',
    html: `
      <div style="position:relative;transform:${scale};transition:transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);cursor:pointer;pointer-events:auto;" class="${pulseClass}">
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 50% 50% 50% 0;
          background: ${borderColor};
          transform: rotate(-45deg);
          box-shadow: ${shadow};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5px;
          position: relative;
          pointer-events: auto;
        ">
          <div style="
            width: 100%;
            height: 100%;
            border-radius: 50%;
            overflow: hidden;
            background: #fff;
            transform: rotate(45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
          ">
            <img src="${avatar}" alt="" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;user-select:none;-webkit-user-drag:none;pointer-events:none;" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'" />
          </div>
        </div>
        ${
          isAvailable
            ? `<div style="
                position: absolute;
                top: -2px;
                right: -2px;
                width: 10px;
                height: 10px;
                background: #10b981;
                border: 2px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                pointer-events: none;
              "></div>`
            : ''
        }
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -48],
  })
}

export const pinIcon = userLocationIcon
export const workerIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#ea580c;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

export const workerLocationIcon = L.divIcon({
  className: 'worker-location-marker',
  html: `
    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(234,88,12,0.3);animation:radar-pulse-orange 2s infinite;"></div>
      <div style="position:relative;width:14px;height:14px;border-radius:50%;background:#ea580c;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

