import { Circle } from 'react-leaflet'

export default function RadiusCircle({ center, radiusM }) {
  return (
    <Circle
      center={center}
      radius={radiusM}
      pathOptions={{
        color: '#f97316',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: '#f97316',
        fillOpacity: 0.04,
      }}
    />
  )
}
