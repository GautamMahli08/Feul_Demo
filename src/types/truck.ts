export interface Truck {
  id: string;
  name: string;
  driver: string;
  status: 'idle' | 'assigned' | 'delivering' | 'completed' | 'uplifting';
  position: {
    lat: number;
    lng: number;
  };
  destination?: {
    lat: number;
    lng: number;
    name: string;
  };
  startPoint?: {
    lat: number;
    lng: number;
  };
  compartments: Compartment[];
  telemetry: {
    speed: number;
    fuelFlow: number;
    tilt: number;
    valveStatus: boolean;
    online: boolean;
    lastUpdate: Date;
    heading: number;
  };
  logs?: { id: string; ts: Date; msg: string }[];
  client: string;
  alerts: Alert[];
  trail: { lat: number; lng: number; timestamp: Date }[];
  currentAssignment?: {
    assignedLiters: number;
    startedAt: Date;
    perCompTargets: Record<string, number>;
    provisionalLossLiters: number;
  };
  lastTripSummary?: TripSummary;
}

export interface Compartment {
  id: string;
  capacity: number;
  currentLevel: number;
  fuelType: string;
  sealNumber?: string;
  isOffloading: boolean;
  targetDelivery?: number;
  deliveredLiters?: number;
  deliveryLog?: { id: string; ts: Date; msg: string }[];
}

export interface Alert {
  id: string;
  type: 'theft' | 'tampering' | 'offline' | 'tilt' | 'valve' | 'route_deviation' | 'loss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  truckId: string;
  acknowledged: boolean;
  location?: { lat: number; lng: number };
}

export interface TripSummary {
  assignedLiters: number;
  deliveredLiters: number;
  lossLiters: number;
  lossPercent: number;
  completedAt: Date;
}

export interface FuelLossHistory {
  timestamp: Date;
  truckId: string;
  assignedLiters: number;
  deliveredLiters: number;
  lossLiters: number;
  lossPercent: number;
}

export type UserRole = 'manager' | 'client' | 'operator' | 'driver';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  permissions: string[];
  assignedTrucks?: string[];
  clientName?: string;
}

export interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'success' | 'warning' | 'danger' | 'primary';
}

export interface TripAssignment {
  id: string;
  truckId: string;
  driverId: string;
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
  compartmentAllocations: {
    compartmentId: string;
    deliveryAmount: number;
    fuelType: string;
  }[];
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  createdAt: Date;
  estimatedDuration: number;
}