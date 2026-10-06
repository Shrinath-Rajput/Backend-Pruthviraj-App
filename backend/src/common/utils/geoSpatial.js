/**
 * Earth radius in meters
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number}
 */
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Calculate Great-Circle distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in meters
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

  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100; // rounded to 2 decimal places
};

/**
 * Validate GPS Coordinates
 * @param {number} lat
 * @param {number} lon
 * @returns {boolean}
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
 * Check if a point is within a circular geofence
 * @param {Object} point - { latitude, longitude }
 * @param {Object} center - { latitude, longitude }
 * @param {number} radiusMeters - Geofence radius in meters
 * @returns {{ isInside: boolean, distanceMeters: number }}
 */
export const checkCircularGeofence = (point, center, radiusMeters) => {
  const distance = calculateDistanceMeters(
    point.latitude,
    point.longitude,
    center.latitude,
    center.longitude
  );

  return {
    isInside: distance <= radiusMeters,
    distanceMeters: distance,
    radiusMeters,
  };
};

/**
 * Check if point is inside a polygon using Ray-Casting algorithm
 * @param {[number, number]} point - [longitude, latitude]
 * @param {Array<[number, number]>} polygonCoordinates - Array of [lon, lat]
 * @returns {boolean}
 */
export const isPointInPolygon = (point, polygonCoordinates) => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygonCoordinates.length - 1; i < polygonCoordinates.length; j = i++) {
    const xi = polygonCoordinates[i][0];
    const yi = polygonCoordinates[i][1];
    const xj = polygonCoordinates[j][0];
    const yj = polygonCoordinates[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Convert lat/lon into GeoJSON Point object for MongoDB 2dsphere indexing
 * Note: GeoJSON coordinates are in [longitude, latitude] order
 * @param {number} latitude
 * @param {number} longitude
 * @returns {{ type: 'Point', coordinates: [number, number] }}
 */
export const toGeoJSONPoint = (latitude, longitude) => {
  return {
    type: "Point",
    coordinates: [Number(longitude), Number(latitude)],
  };
};

export default {
  calculateDistanceMeters,
  isValidCoordinate,
  checkCircularGeofence,
  isPointInPolygon,
  toGeoJSONPoint,
};
