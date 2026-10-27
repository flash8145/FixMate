export const BCRYPT_COST = 10
export const JWT_EXPIRES_IN = '7d'

// Global cap on $geoNear's maxDistance — keeps stage 1 of the search
// pipeline bounded regardless of how large a worker's serviceRadiusM is.
export const MAX_ALLOWED_RADIUS_M = 25000
export const DEFAULT_SEARCH_RADIUS_M = 25000
export const SEARCH_RESULT_LIMIT = 50
