import { useState, useEffect, useCallback, useRef } from 'react';
import { Truck, Alert, FuelLossHistory } from '@/types/truck';
import { format } from 'date-fns';
import { GEOFENCE_ZONES, isInZone, distanceFromPointToSegmentMeters } from '@/data/geofences';

// -----------------------------
// Muscat seeds & helpers
// -----------------------------
const MUSCAT = { lat: 23.5859, lng: 58.4059 };

const seedAround = (lat: number, lng: number, jitterKm = 2) => {
  const toDegLat = jitterKm / 111; // ~1° lat ≈ 111 km
  const toDegLng = jitterKm / (111 * Math.cos(lat * Math.PI / 180));
  return {
    lat: lat + (Math.random() - 0.5) * 2 * toDegLat,
    lng: lng + (Math.random() - 0.5) * 2 * toDegLng,
  };
};

// Landmarks aligned with your GEOFENCE_ZONES
const AIRPORT_DEPOT = { lat: 23.5932, lng: 58.2845, name: 'Airport Depot' };
const GHALA_DEPOT   = { lat: 23.5790, lng: 58.3770, name: 'Ghala Depot' };

const QURUM_SHELL   = { lat: 23.6025, lng: 58.4375, name: 'Shell Station Qurum' };
const AL_KHUWAIR_BP = { lat: 23.5850, lng: 58.4000, name: 'BP Al Khuwair' };
const RUWI_OQ       = { lat: 23.6005, lng: 58.5310, name: 'OQ Station Ruwi' };     // center of polygon
const MUTTRAH_TOTAL = { lat: 23.6160, lng: 58.5650, name: 'TotalEnergies Muttrah' };

// -----------------------------
// Demo trucks (Muscat)
// -----------------------------
const DEMO_TRUCKS: Omit<Truck, 'telemetry' | 'alerts' | 'trail'>[] = [
  {
    id: 'TK001',
    name: 'Fuel Express 01',
    driver: 'John Smith',
    status: 'idle',
    client: 'Shell Station',
    position: seedAround(AIRPORT_DEPOT.lat, AIRPORT_DEPOT.lng, 1.5),
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 4800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 4500, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 3200, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 2800, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK002',
    name: 'Fuel Express 02',
    driver: 'Sarah Johnson',
    status: 'delivering',
    client: 'BP Station',
    position: seedAround(23.5850, 58.3950, 1.2), // between Ghala & Al Khuwair
    destination: { ...AL_KHUWAIR_BP },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 4200, fuelType: 'Diesel', isOffloading: true, targetDelivery: 2000 },
      { id: 'C2', capacity: 5000, currentLevel: 3800, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 4600, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 3400, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK003',
    name: 'Fuel Express 03',
    driver: 'Mike Wilson',
    status: 'assigned',
    client: 'Shell Station',
    position: seedAround(GHALA_DEPOT.lat, GHALA_DEPOT.lng, 1.5),
    destination: { ...QURUM_SHELL },
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 5000, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 5000, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 4800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 4900, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK004',
    name: 'Fuel Express 04',
    driver: 'Lisa Brown',
    status: 'completed',
    client: 'Total Station',
    position: seedAround(MUTTRAH_TOTAL.lat, MUTTRAH_TOTAL.lng, 1.0),
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 500, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 300, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 800, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 200, fuelType: 'Petrol', isOffloading: false },
    ],
  },
  {
    id: 'TK005',
    name: 'Fuel Express 05',
    driver: 'David Garcia',
    status: 'uplifting',
    client: 'Mobil Station',
    position: seedAround(AIRPORT_DEPOT.lat, AIRPORT_DEPOT.lng, 1.0),
    compartments: [
      { id: 'C1', capacity: 5000, currentLevel: 3200, fuelType: 'Diesel', isOffloading: false },
      { id: 'C2', capacity: 5000, currentLevel: 2800, fuelType: 'Petrol', isOffloading: false },
      { id: 'C3', capacity: 5000, currentLevel: 3600, fuelType: 'Diesel', isOffloading: false },
      { id: 'C4', capacity: 5000, currentLevel: 3100, fuelType: 'Petrol', isOffloading: false },
    ],
  },
];

// -----------------------------
// Simulation hook
// -----------------------------
export const useTruckSimulation = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalSavings, setTotalSavings] = useState(847562);
  const [fuelConsumptionData, setFuelConsumptionData] = useState<Array<{ timestamp: Date; truckId: string; liters: number }>>([]);
  const [fuelLossHistory, setFuelLossHistory] = useState<FuelLossHistory[]>([]);
  
  // Geofence state tracking (kept for future use)
  const geofenceStateRef = useRef<Record<string, {
    inDepot?: string;
    inDelivery?: string;
    inDanger?: string;
    deviating?: boolean;
  }>>({});

  const CORRIDOR_WIDTH_M = 500;

  // Initialize trucks with telemetry and trails
  useEffect(() => {
    const initializedTrucks: Truck[] = DEMO_TRUCKS.map(truck => ({
      ...truck,
      telemetry: {
        speed: Math.random() * 60 + 20,
        fuelFlow: truck.status === 'delivering' ? Math.random() * 50 + 10 : 0,
        tilt: Math.random() * 5,
        valveStatus: truck.status === 'delivering',
        online: Math.random() > 0.1,
        lastUpdate: new Date(),
        heading: Math.random() * 360,
      },
      logs: [],
      alerts: [],
      trail: [{ ...truck.position, timestamp: new Date() }],
    }));
    setTrucks(initializedTrucks);
  }, []);

  // Simulate truck movement and telemetry updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTrucks(prevTrucks => {
        return prevTrucks.map(truck => {
          const newTruck = { ...truck };
          
          // Update position based on status
          if (truck.status === 'delivering' && truck.destination) {
            const deltaLat = (truck.destination.lat - truck.position.lat) * 0.01;
            const deltaLng = (truck.destination.lng - truck.position.lng) * 0.01;
            newTruck.position = {
              lat: truck.position.lat + deltaLat + (Math.random() - 0.5) * 0.001,
              lng: truck.position.lng + deltaLng + (Math.random() - 0.5) * 0.001,
            };
            
            // Check if reached destination (approx ~500m)
            const distance = Math.sqrt(
              Math.pow(newTruck.position.lat - truck.destination.lat, 2) +
              Math.pow(newTruck.position.lng - truck.destination.lng, 2)
            );
            
            if (distance < 0.005) {
              newTruck.status = 'completed';
              
              // Calculate trip summary for fuel loss tracking
              if (newTruck.currentAssignment) {
                const assignedLiters = newTruck.currentAssignment.assignedLiters;
                const deliveredLiters = newTruck.compartments
                  .reduce((sum, comp) => sum + (comp.deliveredLiters || 0), 0);
                const lossLiters = newTruck.currentAssignment.provisionalLossLiters;
                const lossPercent = assignedLiters > 0 ? (lossLiters / assignedLiters) * 100 : 0;
                
                newTruck.lastTripSummary = {
                  assignedLiters,
                  deliveredLiters,
                  lossLiters,
                  lossPercent,
                  completedAt: new Date()
                };
                
                // Add to fuel loss history
                setFuelLossHistory(prev => [
                  ...prev.slice(-499),
                  {
                    timestamp: new Date(),
                    truckId: truck.id,
                    assignedLiters,
                    deliveredLiters,
                    lossLiters,
                    lossPercent
                  }
                ]);
                
                // Generate loss alert if threshold exceeded
                if (lossPercent > 2.5) {
                  const lossAlert: Alert = {
                    id: `alert-${Date.now()}-loss`,
                    type: 'loss',
                    severity: lossPercent > 5 ? 'high' : 'medium',
                    message: `Fuel loss detected: ${lossLiters.toFixed(1)}L (${lossPercent.toFixed(1)}%) on ${truck.name}`,
                    timestamp: new Date(),
                    truckId: truck.id,
                    acknowledged: false,
                    location: newTruck.position
                  };
                  
                  setAlerts(prev => [lossAlert, ...prev.slice(0, 49)]);
                }
                
                newTruck.logs = [
                  ...(truck.logs || []).slice(-40),
                  { id: `log-${Date.now()}`, ts: new Date(), msg: `Trip result: Assigned ${assignedLiters}L, Delivered ${deliveredLiters.toFixed(1)}L, Loss ${lossLiters.toFixed(1)}L (${lossPercent.toFixed(1)}%)` }
                ];
              } else {
                const completedComps = newTruck.compartments.filter(c => c.isOffloading).length;
                newTruck.logs = [
                  ...(newTruck.logs || []).slice(-40),
                  { id: `log-${Date.now()}`, ts: new Date(), msg: `Delivery completed (${completedComps} compartments)` }
                ];
              }
            }
          } else if (truck.status === 'assigned') {
            // Start delivery - auto-assign targets
            newTruck.status = 'delivering';
            const totalAssigned = Math.floor(Math.random() * 2500) + 2500; // 2500-5000L
            let remainingToAssign = totalAssigned;
            
            const perCompTargets: Record<string, number> = {};
            
            newTruck.compartments = truck.compartments.map((comp, idx) => {
              if (remainingToAssign > 0 && comp.currentLevel > comp.capacity * 0.1) {
                const maxFromThisComp = Math.min(remainingToAssign, comp.currentLevel - comp.capacity * 0.05);
                const assignedAmount = Math.min(maxFromThisComp, Math.floor(Math.random() * 1500) + 500);
                remainingToAssign -= assignedAmount;
                perCompTargets[comp.id] = assignedAmount;
                
                return {
                  ...comp,
                  targetDelivery: assignedAmount,
                  deliveredLiters: 0,
                  isOffloading: assignedAmount > 0,
                  deliveryLog: []
                };
              }
              perCompTargets[comp.id] = 0;
              return { ...comp, targetDelivery: 0, deliveredLiters: 0, isOffloading: false };
            });
            
            // Set current assignment for fuel loss tracking
            newTruck.currentAssignment = {
              assignedLiters: totalAssigned,
              startedAt: new Date(),
              perCompTargets,
              provisionalLossLiters: 0
            };
            
            const assignedComps = newTruck.compartments.filter(c => c.isOffloading);
            const assignmentSummary = assignedComps.map(c => `${c.id} ${c.targetDelivery}L`).join(', ');
            newTruck.logs = [
              ...(truck.logs || []).slice(-40),
              { id: `log-${Date.now()}`, ts: new Date(), msg: `Assigned: ${assignmentSummary} → ${truck.destination?.name}` }
            ];
            
          } else if (truck.status === 'uplifting') {
            // Refill compartments
            let anyRefilled = false;
            newTruck.compartments = truck.compartments.map(comp => {
              if (comp.currentLevel < comp.capacity * 0.98) {
                const fillAmount = Math.floor(Math.random() * 40) + 40; // 40-80L per tick
                const newLevel = Math.min(comp.capacity, comp.currentLevel + fillAmount);
                const actualFilled = newLevel - comp.currentLevel;
                
                if (actualFilled > 0) {
                  anyRefilled = true;
                  
                  // Log every 100L milestone
                  if (Math.floor(newLevel / 100) > Math.floor(comp.currentLevel / 100)) {
                    const newLog = { id: `log-${Date.now()}-${comp.id}`, ts: new Date(), msg: `${comp.id} refilled to ${Math.round(newLevel)}L` };
                    newTruck.logs = [...(newTruck.logs || []).slice(-40), newLog];
                  }
                }
                
                return { ...comp, currentLevel: newLevel, deliveredLiters: 0 };
              }
              return { ...comp, deliveredLiters: 0 };
            });
            
            // Check if all compartments are full
            const allFull = newTruck.compartments.every(comp => comp.currentLevel >= comp.capacity * 0.95);
            if (allFull) {
              newTruck.status = 'idle';
              newTruck.destination = undefined;
              newTruck.startPoint = undefined;
              newTruck.logs = [
                ...(newTruck.logs || []).slice(-40),
                { id: `log-${Date.now()}`, ts: new Date(), msg: 'Uplift completed; ready for assignment' }
              ];
            }
          } else if (truck.status === 'completed') {
            // Move to uplifting
            newTruck.status = 'uplifting';
            newTruck.compartments = truck.compartments.map(comp => ({
              ...comp,
              isOffloading: false,
              targetDelivery: 0
            }));
          } else {
            // Random position drift for idle trucks
            newTruck.position = {
              lat: truck.position.lat + (Math.random() - 0.5) * 0.0001,
              lng: truck.position.lng + (Math.random() - 0.5) * 0.0001,
            };
          }

          // Calculate heading from trail
          let heading = truck.telemetry.heading;
          if (truck.trail.length >= 2) {
            const recent = truck.trail[truck.trail.length - 1];
            const previous = truck.trail[truck.trail.length - 2];
            const deltaLat = recent.lat - previous.lat;
            const deltaLng = recent.lng - previous.lng;
            if (deltaLat !== 0 || deltaLng !== 0) {
              heading = (Math.atan2(deltaLng, deltaLat) * 180 / Math.PI + 360) % 360;
            }
          }

          // Update telemetry
          newTruck.telemetry = {
            speed: Math.max(0, truck.telemetry.speed + (Math.random() - 0.5) * 10),
            fuelFlow: truck.status === 'delivering' ? Math.random() * 50 + 10 : 0,
            tilt: Math.max(0, truck.telemetry.tilt + (Math.random() - 0.5) * 2),
            valveStatus: truck.status === 'delivering',
            online: Math.random() > 0.05,
            lastUpdate: new Date(),
            heading,
          };

          // Update compartments during delivery with detailed drain logic
          if (truck.status === 'delivering') {
            let totalDrained = 0;
            
            newTruck.compartments = truck.compartments.map(comp => {
              if (comp.isOffloading && comp.currentLevel > 0 && (comp.deliveredLiters || 0) < (comp.targetDelivery || 0)) {
                const drainRate = Math.floor(Math.random() * 40) + 20; // 20-60L per tick
                const remaining = (comp.targetDelivery || 0) - (comp.deliveredLiters || 0);
                const reserve = comp.capacity * 0.05; // 5% reserve
                const maxDrain = Math.min(drainRate, remaining, comp.currentLevel - reserve);
                
                if (maxDrain > 0) {
                  const newLevel = comp.currentLevel - maxDrain;
                  const newDelivered = (comp.deliveredLiters || 0) + maxDrain;
                  totalDrained += maxDrain;
                  
                  // Check if delivery target reached
                  if (newDelivered >= (comp.targetDelivery || 0) || newLevel <= reserve) {
                    // Simulate fuel loss (shrinkage) with 30% probability
                    let compLossLiters = 0;
                    if (Math.random() < 0.3) {
                      const lossPercent = Math.random() * 2 + 0.5; // 0.5-2.5% loss
                      compLossLiters = Math.round((comp.targetDelivery || 0) * lossPercent / 100);
                      
                      // Add loss to truck's provisional loss
                      if (newTruck.currentAssignment) {
                        newTruck.currentAssignment.provisionalLossLiters += compLossLiters;
                      }
                      
                      // Generate loss alert if significant
                      if (compLossLiters > 10 || lossPercent > 1) {
                        const lossAlert: Alert = {
                          id: `alert-${Date.now()}-comp-loss`,
                          type: 'loss',
                          severity: lossPercent > 2 ? 'medium' : 'low',
                          message: `Compartment ${comp.id} loss: ${compLossLiters}L (${lossPercent.toFixed(1)}%) on ${truck.name}`,
                          timestamp: new Date(),
                          truckId: truck.id,
                          acknowledged: false,
                          location: newTruck.position
                        };
                        
                        setAlerts(prev => [lossAlert, ...prev.slice(0, 49)]);
                      }
                    }
                    
                    const deliveryLog = [
                      ...(comp.deliveryLog || []).slice(-10),
                      { 
                        id: `del-${Date.now()}-${comp.id}`, 
                        ts: new Date(), 
                        msg: compLossLiters > 0 
                          ? `${comp.id} delivered ${Math.round(newDelivered)}L (Loss: ${compLossLiters}L)`
                          : `${comp.id} delivered ${Math.round(newDelivered)}L`
                      }
                    ];
                    
                    newTruck.logs = [
                      ...(newTruck.logs || []).slice(-40),
                      { 
                        id: `log-${Date.now()}-${comp.id}`, 
                        ts: new Date(), 
                        msg: compLossLiters > 0 
                          ? `${comp.id} delivered ${Math.round(newDelivered)}L (Loss: ${compLossLiters}L)`
                          : `${comp.id} delivered ${Math.round(newDelivered)}L`
                      }
                    ];
                    
                    return {
                      ...comp,
                      currentLevel: newLevel,
                      deliveredLiters: newDelivered,
                      isOffloading: false,
                      deliveryLog
                    };
                  }
                  
                  return {
                    ...comp,
                    currentLevel: newLevel,
                    deliveredLiters: newDelivered
                  };
                }
              }
              return comp;
            });
            
            // Random events during delivery
            if (Math.random() < 0.005) { // 0.5% chance of theft
              const activeComps = newTruck.compartments.filter(c => c.isOffloading);
              if (activeComps.length > 0) {
                const victimComp = activeComps[Math.floor(Math.random() * activeComps.length)];
                const stolenAmount = Math.floor(Math.random() * 100) + 50;
                
                newTruck.compartments = newTruck.compartments.map(comp => 
                  comp.id === victimComp.id 
                    ? { ...comp, currentLevel: Math.max(0, comp.currentLevel - stolenAmount) }
                    : comp
                );
                
                const newAlert: Alert = {
                  id: `alert-${Date.now()}-theft`,
                  type: 'theft',
                  severity: 'high',
                  message: `Sudden drop ${victimComp.id} −${stolenAmount}L (possible theft)`,
                  timestamp: new Date(),
                  truckId: truck.id,
                  acknowledged: false,
                  location: newTruck.position,
                };
                
                setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
                newTruck.logs = [
                  ...(newTruck.logs || []).slice(-40),
                  { id: `log-${Date.now()}-theft`, ts: new Date(), msg: `Sudden drop ${victimComp.id} −${stolenAmount}L (possible theft)` }
                ];
              }
            }
            
            // Valve tampering
            if (Math.random() < 0.003) {
              newTruck.telemetry.valveStatus = false;
              const newAlert: Alert = {
                id: `alert-${Date.now()}-valve`,
                type: 'valve',
                severity: 'medium',
                message: `Valve fault detected on ${truck.name}`,
                timestamp: new Date(),
                truckId: truck.id,
                acknowledged: false,
                location: newTruck.position,
              };
              
              setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
              newTruck.logs = [
                ...(newTruck.logs || []).slice(-40),
                { id: `log-${Date.now()}-valve`, ts: new Date(), msg: 'Valve tampering detected' }
              ];
            }
            
            // Tilt event
            if (Math.random() < 0.002) {
              newTruck.telemetry.tilt = Math.random() * 5 + 10; // 10-15 degrees
              const newAlert: Alert = {
                id: `alert-${Date.now()}-tilt`,
                type: 'tilt',
                severity: 'medium',
                message: `Excessive tilt detected on ${truck.name}`,
                timestamp: new Date(),
                truckId: truck.id,
                acknowledged: false,
                location: newTruck.position,
              };
              
              setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
              newTruck.logs = [
                ...(newTruck.logs || []).slice(-40),
                { id: `log-${Date.now()}-tilt`, ts: new Date(), msg: `Excessive tilt: ${newTruck.telemetry.tilt.toFixed(1)}°` }
              ];
            }
            
            // Update fuel flow based on actual drain
            newTruck.telemetry.fuelFlow = totalDrained;
          }
          
          // Offline events during uplifting
          if (truck.status === 'uplifting' && Math.random() < 0.001) {
            newTruck.telemetry.online = false;
            const newAlert: Alert = {
              id: `alert-${Date.now()}-offline`,
              type: 'offline',
              severity: 'high',
              message: `Telematics offline during fueling: ${truck.name}`,
              timestamp: new Date(),
              truckId: truck.id,
              acknowledged: false,
              location: newTruck.position,
            };
            
            setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
            newTruck.logs = [
              ...(newTruck.logs || []).slice(-40),
              { id: `log-${Date.now()}-offline`, ts: new Date(), msg: 'Telematics offline during fueling' }
            ];
          }

          // Add to trail
          newTruck.trail = [
            ...truck.trail.slice(-20), // Keep last 20 positions
            { ...newTruck.position, timestamp: new Date() }
          ];

          // Generate random alerts
          if (Math.random() < 0.01) {
            const alertTypes = ['theft', 'tampering', 'tilt', 'valve'] as const;
            const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
            
            const newAlert: Alert = {
              id: `alert-${Date.now()}-${Math.random()}`,
              type: alertType,
              severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
              message: getAlertMessage(alertType, truck.name),
              timestamp: new Date(),
              truckId: truck.id,
              acknowledged: false,
              location: newTruck.position,
            };

            setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
          }

          // Track fuel consumption based on actual fuel flow
          if (truck.status === 'delivering' && newTruck.telemetry.fuelFlow > 0) {
            setFuelConsumptionData(prev => [
              ...prev.slice(-1000), // Keep last 1000 entries
              {
                timestamp: new Date(),
                truckId: truck.id,
                liters: newTruck.telemetry.fuelFlow
              }
            ]);
          }

          return newTruck;
        });
      });

      // Update savings (demo)
      setTotalSavings(prev => prev + Math.floor(Math.random() * 100));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const getAlertMessage = (type: string, truckName: string): string => {
    switch (type) {
      case 'theft':
        return `Possible fuel theft detected on ${truckName}`;
      case 'tampering':
        return `Valve tampering detected on ${truckName}`;
      case 'tilt':
        return `Unusual tilt angle detected on ${truckName}`;
      case 'valve':
        return `Unauthorized valve operation on ${truckName}`;
      case 'loss':
        return `Fuel loss detected on ${truckName}`;
      default:
        return `Alert from ${truckName}`;
    }
  };

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, []);

  const assignTrip = useCallback((truckId: string, destination: { lat: number; lng: number; name: string }) => {
    setTrucks(prev => prev.map(truck =>
      truck.id === truckId 
        ? { 
            ...truck, 
            status: 'assigned', 
            destination,
            startPoint: truck.position
          }
        : truck
    ));
  }, []);

  return {
    trucks,
    alerts,
    totalSavings,
    fuelConsumptionData,
    fuelLossHistory,
    acknowledgeAlert,
    assignTrip,
  };
};
