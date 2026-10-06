/**
 * Earth radius in meters
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Degrees to radians
 */
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Calculate Great-Circle distance using Haversine formula
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in meters rounded to 2 decimals
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100;
};

/**
 * Validate latitude and longitude bounds
 */
export const isValidCoordinate = (lat, lon) => {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

/**
 * Check if a point [longitude, latitude] is inside a polygon using ray casting
 * @param {[number, number]} point - [longitude, latitude]
 * @param {Array<Array<[number, number]>>|Array<[number, number]>} polygonCoords
 */
export const isPointInPolygon = (point, polygonCoords) => {
  if (!polygonCoords || polygonCoords.length === 0) return false;
  // Handle GeoJSON polygon: array of rings, outer ring is first
  const ring = Array.isArray(polygonCoords[0][0]) ? polygonCoords[0] : polygonCoords;

  const [x, y] = point; // [lon, lat]
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Full Geofence Evaluation Engine
 */
export const evaluateGeofence = ({
  userLat,
  userLon,
  gpsAccuracyMeters = 5.0,
  siteCentroidCoords, // [longitude, latitude]
  geofenceRadiusMeters = 50.0,
  boundaryPolygon = null,
  gpsAccuracyThresholdMeters = 20.0,
}) => {
  if (!isValidCoordinate(userLat, userLon)) {
    return {
      isInsideGeofence: false,
      distanceMeters: Infinity,
      gpsAccuracyMeters,
      allowedRadiusMeters: geofenceRadiusMeters,
      verificationStatus: "REJECTED",
      reason: "INVALID_COORDINATES",
    };
  }

  // Reject inaccurate GPS readings
  if (gpsAccuracyMeters > gpsAccuracyThresholdMeters) {
    return {
      isInsideGeofence: false,
      distanceMeters: Infinity,
      gpsAccuracyMeters,
      allowedRadiusMeters: geofenceRadiusMeters,
      verificationStatus: "REJECTED",
      reason: "POOR_GPS_ACCURACY",
    };
  }

  const [siteLon, siteLat] = siteCentroidCoords;
  const distance = calculateDistanceMeters(userLat, userLon, siteLat, siteLon);

  // Buffer allowed accuracy (max 5m buffer)
  const accuracyBuffer = Math.min(gpsAccuracyMeters, 5.0);
  const effectiveAllowedRadius = geofenceRadiusMeters + accuracyBuffer;

  let isInside = distance <= effectiveAllowedRadius;

  // Check polygon boundary if configured
  if (boundaryPolygon && boundaryPolygon.coordinates && boundaryPolygon.coordinates.length > 0) {
    const polygonCheck = isPointInPolygon([userLon, userLat], boundaryPolygon.coordinates);
    isInside = isInside || polygonCheck;
  }

  return {
    isInsideGeofence: isInside,
    distanceMeters: distance,
    gpsAccuracyMeters,
    allowedRadiusMeters: geofenceRadiusMeters,
    verificationStatus: isInside ? "VERIFIED" : "FLAGGED_BREACH",
  };
};

export default {
  calculateDistanceMeters,
  isValidCoordinate,
  isPointInPolygon,
  evaluateGeofence,
};
