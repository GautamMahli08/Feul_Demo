// geofence.ts

// -----------------------------
// Types
// -----------------------------
export interface GeoZone {
  id: string;
  name: string;
  type: 'depot' | 'delivery' | 'danger';
  shape: 'polygon' | 'circle';
  polygon?: { lat: number; lng: number }[];
  center?: { lat: number; lng: number };
  radius?: number; // meters
  clientName?: string; // for delivery zones
}

// -----------------------------
// Demo geofence zones — Muscat, Oman
// -----------------------------
export const GEOFENCE_ZONES: GeoZone[] = [
  // Depot Zones (Green)
  {
    id: 'depot-1',
    name: 'Airport Depot',
    type: 'depot',
    shape: 'polygon',
    polygon: [
      { lat: 23.5926, lng: 58.2839 },
      { lat: 23.5926, lng: 58.2851 },
      { lat: 23.5936, lng: 58.2851 },
      { lat: 23.5936, lng: 58.2839 }
    ]
  },
  {
    id: 'depot-2',
    name: 'Ghala Depot',
    type: 'depot',
    shape: 'circle',
    center: { lat: 23.5790, lng: 58.3770 },
    radius: 250
  },

  // Delivery Zones (Blue)
  {
    id: 'delivery-1',
    name: 'Shell Station Qurum',
    type: 'delivery',
    shape: 'circle',
    center: { lat: 23.6025, lng: 58.4375 },
    radius: 120,
    clientName: 'Shell'
  },
  {
    id: 'delivery-2',
    name: 'BP Al Khuwair',
    type: 'delivery',
    shape: 'circle',
    center: { lat: 23.5850, lng: 58.4000 },
    radius: 120,
    clientName: 'BP'
  },
  {
    id: 'delivery-3',
    name: 'OQ Station Ruwi',
    type: 'delivery',
    shape: 'polygon',
    polygon: [
      { lat: 23.6000, lng: 58.5300 },
      { lat: 23.6000, lng: 58.5320 },
      { lat: 23.6010, lng: 58.5320 },
      { lat: 23.6010, lng: 58.5300 }
    ],
    clientName: 'OQ'
  },
  {
    id: 'delivery-4',
    name: 'TotalEnergies Muttrah',
    type: 'delivery',
    shape: 'circle',
    center: { lat: 23.6160, lng: 58.5650 },
    radius: 140,
    clientName: 'TotalEnergies'
  },

  // Danger Zones (Red)
  {
    id: 'danger-1',
    name: 'Port Security Zone',
    type: 'danger',
    shape: 'polygon',
    polygon: [
      { lat: 23.6235, lng: 58.5635 },
      { lat: 23.6235, lng: 58.5680 },
      { lat: 23.6255, lng: 58.5680 },
      { lat: 23.6255, lng: 58.5635 }
    ]
  },
  {
    id: 'danger-2',
    name: 'Royal Precinct (Restricted)',
    type: 'danger',
    shape: 'circle',
    center: { lat: 23.5760, lng: 58.4100 },
    radius: 200
  }
];

// -----------------------------
// Geometry helpers
// -----------------------------
export const pointInPolygon = (
  lat: number,
  lng: number,
  polygon: { lat: number; lng: number }[]
): boolean => {
  // Ray-casting algorithm
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }
  return inside;
};

export const haversineDistanceMeters = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const R = 6371000; // meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const hh =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(hh), Math.sqrt(1 - hh));
  return R * c;
};

export const isInsideCircle = (
  lat: number,
  lng: number,
  center: { lat: number; lng: number },
  radiusMeters: number
): boolean => {
  return haversineDistanceMeters({ lat, lng }, center) <= radiusMeters;
};

export const distanceFromPointToSegmentMeters = (
  point: { lat: number; lng: number },
  segStart: { lat: number; lng: number },
  segEnd: { lat: number; lng: number }
): number => {
  // Project point onto segment and compute haversine distance to closest point
  const A = point.lat - segStart.lat;
  const B = point.lng - segStart.lng;
  const C = segEnd.lat - segStart.lat;
  const D = segEnd.lng - segStart.lng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? dot / lenSq : -1;

  let xx: number, yy: number;
  if (param < 0) {
    xx = segStart.lat;
    yy = segStart.lng;
  } else if (param > 1) {
    xx = segEnd.lat;
    yy = segEnd.lng;
  } else {
    xx = segStart.lat + param * C;
    yy = segStart.lng + param * D;
  }

  return haversineDistanceMeters(point, { lat: xx, lng: yy });
};

export const isInZone = (lat: number, lng: number, zone: GeoZone): boolean => {
  if (zone.shape === 'circle' && zone.center && typeof zone.radius === 'number') {
    return isInsideCircle(lat, lng, zone.center, zone.radius);
  } else if (zone.shape === 'polygon' && zone.polygon) {
    return pointInPolygon(lat, lng, zone.polygon);
  }
  return false;
};

// -----------------------------
// Optional utility: find all zones containing a point
// -----------------------------
export const zonesContainingPoint = (
  lat: number,
  lng: number,
  zones: GeoZone[] = GEOFENCE_ZONES
): GeoZone[] => zones.filter(z => isInZone(lat, lng, z));
