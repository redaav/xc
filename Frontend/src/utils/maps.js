const FARE_CONFIG = {
  auto: { base: 30, perKm: 10, perMin: 2 },
  car: { base: 50, perKm: 15, perMin: 3 },
  bike: { base: 20, perKm: 8, perMin: 1.5 },
};

export function calculateFare(distanceMeters, durationSeconds) {
  const distanceKm = distanceMeters / 1000;
  const durationMin = durationSeconds / 60;

  return {
    auto: Math.round(FARE_CONFIG.auto.base + distanceKm * FARE_CONFIG.auto.perKm + durationMin * FARE_CONFIG.auto.perMin),
    car: Math.round(FARE_CONFIG.car.base + distanceKm * FARE_CONFIG.car.perKm + durationMin * FARE_CONFIG.car.perMin),
    bike: Math.round(FARE_CONFIG.bike.base + distanceKm * FARE_CONFIG.bike.perKm + durationMin * FARE_CONFIG.bike.perMin),
  };
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDuration(distanceMeters) {
  const avgSpeedKmh = 30;
  return Math.round((distanceMeters / 1000 / avgSpeedKmh) * 3600);
}

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
