/**
 * Calculates the great-circle distance between two coordinates in meters
 * using the Haversine formula.
 *
 * @param {[number, number]} coord1 - [lat, lng] or [lng, lat] depending on isLngLat
 * @param {[number, number]} coord2 - [lat, lng] or [lng, lat]
 * @param {boolean} [isLngLat=false] - If true, coords are [lng, lat] (GeoJSON format)
 * @returns {number} Distance in meters rounded to nearest integer
 */
export function calculateDistanceM(coord1, coord2, isLngLat = false) {
  const [c1a, c1b] = coord1
  const [c2a, c2b] = coord2

  const lat1 = isLngLat ? c1b : c1a
  const lon1 = isLngLat ? c1a : c1b
  const lat2 = isLngLat ? c2b : c2a
  const lon2 = isLngLat ? c2a : c2b

  const R = 6371000 // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}
