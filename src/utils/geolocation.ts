export interface PharmacyLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const PHARMACY_LOCATION: PharmacyLocation = {
  name: 'Farmácia Super Popular - Centro',
  address: 'Av. Nereu Ramos, 897 • Centro',
  city: 'Itapema',
  state: 'SC',
  lat: -27.0912,
  lng: -48.6115
};

// Distances (km) estimated from pharmacy headquarters in Centro for Itapema neighborhoods
export const NEIGHBORHOOD_DISTANCES_KM: Record<string, number> = {
  'centro': 0.8,
  'canto da praia': 2.4,
  'meia praia': 3.6,
  'morretes': 4.2,
  'tabuleiro': 4.8,
  'várzea': 5.4,
  'alto são bento': 6.2,
  'ilhotas': 8.5
};

/**
 * Calculates distance in kilometers between two GPS coordinates using the Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
}

export interface DeliveryEstimate {
  distanceKm: number;
  minMinutes: number;
  maxMinutes: number;
  formattedTime: string;
  isGps: boolean;
  accuracyMeters?: number;
  sourceText: string;
}

/**
 * Computes delivery time estimate based on distance in km from the pharmacy.
 * Base preparation: 15 min + ~3.5 min/km motoboy transit with traffic buffer.
 */
export function estimateDeliveryTime(distanceKm: number, isGps: boolean = false, accuracyMeters?: number): DeliveryEstimate {
  const clampedDist = Math.max(0.3, distanceKm);
  
  // Base packaging & separation: 12-15 min
  // Transit speed: ~3.5 min per km in urban coastal route
  const minMin = Math.round(15 + clampedDist * 3.0);
  const maxMin = Math.round(20 + clampedDist * 4.5);

  // Round to closest 5 minutes for clean customer display
  const roundedMin = Math.max(15, Math.ceil(minMin / 5) * 5);
  const roundedMax = Math.max(roundedMin + 10, Math.ceil(maxMin / 5) * 5);

  return {
    distanceKm: clampedDist,
    minMinutes: roundedMin,
    maxMinutes: roundedMax,
    formattedTime: `${roundedMin} a ${roundedMax} min`,
    isGps,
    accuracyMeters,
    sourceText: isGps 
      ? `Via GPS em tempo real (${clampedDist.toFixed(1)} km da farmácia)`
      : `Estimativa pelo bairro (${clampedDist.toFixed(1)} km aproximados)`
  };
}

/**
 * Get delivery estimate for a specific neighborhood name
 */
export function estimateByNeighborhood(neighborhoodName: string): DeliveryEstimate {
  const cleanName = neighborhoodName.trim().toLowerCase();
  const distance = NEIGHBORHOOD_DISTANCES_KM[cleanName] || 3.0;
  return estimateDeliveryTime(distance, false);
}
