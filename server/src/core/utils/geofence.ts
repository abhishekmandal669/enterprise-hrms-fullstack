/**
 * Geofencing & GPS Coordinate Verification Utility (Haversine Formula)
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceRule {
  officeLatitude: number;
  officeLongitude: number;
  allowedRadiusMeters: number;
}

// Default Corporate Headquarters Location (e.g., Cyber City, Gurugram / Tech Park)
export const DEFAULT_OFFICE_GEOFENCE: GeofenceRule = {
  officeLatitude: 28.4595,
  officeLongitude: 77.0266,
  allowedRadiusMeters: 250 // 250 meters tolerance
};

/**
 * Calculates distance in meters between two lat/lng coordinates using the Haversine formula
 */
export function calculateHaversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

/**
 * Validates if the employee's GPS coordinates are within the configured office perimeter.
 */
export function validateGeofence(
  employeeCoord: Coordinates | null | undefined,
  rule: GeofenceRule = DEFAULT_OFFICE_GEOFENCE,
  enforceGeofence: boolean = false
): { isWithinGeofence: boolean; distanceMeters: number; reason?: string } {
  // If geofence check is not enforced or no GPS provided in dev mode
  if (!enforceGeofence) {
    return {
      isWithinGeofence: true,
      distanceMeters: employeeCoord ? calculateHaversineDistance(employeeCoord, { latitude: rule.officeLatitude, longitude: rule.officeLongitude }) : 0
    };
  }

  if (!employeeCoord || typeof employeeCoord.latitude !== 'number' || typeof employeeCoord.longitude !== 'number') {
    return {
      isWithinGeofence: false,
      distanceMeters: -1,
      reason: 'GPS coordinates missing or permission denied on client device.'
    };
  }

  const distance = calculateHaversineDistance(employeeCoord, {
    latitude: rule.officeLatitude,
    longitude: rule.officeLongitude
  });

  const isWithin = distance <= rule.allowedRadiusMeters;

  return {
    isWithinGeofence: isWithin,
    distanceMeters: distance,
    reason: isWithin ? undefined : `Outside authorized office perimeter (${distance}m > ${rule.allowedRadiusMeters}m allowed)`
  };
}
