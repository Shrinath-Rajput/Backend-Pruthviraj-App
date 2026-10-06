import { describe, it, expect } from "vitest";
import {
  calculateDistanceMeters,
  evaluateGeofence,
  isPointInPolygon,
  isValidCoordinate,
} from "../../src/common/utils/geoSpatial.js";

describe("GeoSpatial & Precision Geofencing Engine Tests (Section 13)", () => {
  const siteCentroid = [73.856743, 18.52043]; // [longitude, latitude] in Pune
  const radius = 50.0; // 50m

  it("should accurately compute distance between two close coordinates using Haversine formula", () => {
    // Exact same point = 0 distance
    const dist0 = calculateDistanceMeters(18.52043, 73.856743, 18.52043, 73.856743);
    expect(dist0).toBe(0);

    // Very slight offset (~11 meters)
    const distOffset = calculateDistanceMeters(18.52043, 73.856743, 18.52053, 73.856743);
    expect(distOffset).toBeGreaterThan(5);
    expect(distOffset).toBeLessThan(20);
  });

  it("should verify point inside circular geofence", () => {
    const result = evaluateGeofence({
      userLat: 18.52045, // very close (~2m away)
      userLon: 73.856743,
      gpsAccuracyMeters: 3.0,
      siteCentroidCoords: siteCentroid,
      geofenceRadiusMeters: radius,
    });

    expect(result.isInsideGeofence).toBe(true);
    expect(result.verificationStatus).toBe("VERIFIED");
    expect(result.distanceMeters).toBeLessThan(10);
  });

  it("should flag breach when user is outside geofence boundary (Section 13 & 44)", () => {
    const result = evaluateGeofence({
      userLat: 18.525, // ~500m away
      userLon: 73.856743,
      gpsAccuracyMeters: 4.0,
      siteCentroidCoords: siteCentroid,
      geofenceRadiusMeters: radius,
    });

    expect(result.isInsideGeofence).toBe(false);
    expect(result.verificationStatus).toBe("FLAGGED_BREACH");
    expect(result.distanceMeters).toBeGreaterThan(radius);
  });

  it("should reject punches with inaccurate GPS readings exceeding threshold", () => {
    const result = evaluateGeofence({
      userLat: 18.52043,
      userLon: 73.856743,
      gpsAccuracyMeters: 45.0, // poor accuracy (> 20m threshold)
      siteCentroidCoords: siteCentroid,
      geofenceRadiusMeters: radius,
      gpsAccuracyThresholdMeters: 20.0,
    });

    expect(result.isInsideGeofence).toBe(false);
    expect(result.verificationStatus).toBe("REJECTED");
    expect(result.reason).toBe("POOR_GPS_ACCURACY");
  });

  it("should evaluate point-in-polygon containment accurately", () => {
    // Square around [10, 10] to [20, 20]
    const polygon = [
      [10, 10],
      [20, 10],
      [20, 20],
      [10, 20],
      [10, 10],
    ];

    expect(isPointInPolygon([15, 15], polygon)).toBe(true);
    expect(isPointInPolygon([25, 25], polygon)).toBe(false);
  });
});
