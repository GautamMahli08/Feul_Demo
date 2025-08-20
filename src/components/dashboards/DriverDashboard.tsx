import React from 'react';
import { Truck, Alert, UserRole, FuelLossHistory } from '@/types/truck';
import DashboardLayout from './DashboardLayout';
import FleetMap from '../FleetMap';
import KPIGrid from '../KPIGrid';
import { Badge } from '@/components/ui/badge';
import FleetStatusSummary from '../FleetStatusSummary';
import MonthlyFuelChart from '../MonthlyFuelChart';
import StatusBadge from '../StatusBadge';
import SpeedGauge from '../SpeedGauge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin, Fuel, AlertTriangle } from 'lucide-react';

interface DriverDashboardProps {
  trucks: Truck[];
  alerts: Alert[];
  totalSavings: number;
  fuelConsumptionData: any[];
  fuelLossHistory: FuelLossHistory[];
  acknowledgeAlert: (alertId: string) => void;
  assignTrip: (truckId: string, destination: { lat: number; lng: number; name: string }) => void;
  currentUser: { role: UserRole; name: string };
  onLogout: () => void;
}

const DriverDashboard = ({
  trucks,
  alerts,
  fuelConsumptionData,
  fuelLossHistory,
  currentUser,
  onLogout,
}: DriverDashboardProps) => {
  // In a real app, this would be based on the logged-in driver
  const myTruck = trucks.find(truck => truck.driver === currentUser.name) || trucks[0];
  const myAlerts = alerts.filter(alert => alert.truckId === myTruck?.id);

  // Compute driver display status
  const getDriveDisplayStatus = (truck: Truck) => {
    const isOffloading = truck.compartments.some(comp => comp.isOffloading);
    const valveOpen = truck.telemetry.valveStatus;

    if (!truck.telemetry.online) return 'offline';
    if (truck.status === 'uplifting') return 'uplifting';
    if (isOffloading || valveOpen) return 'draining';
    if (truck.destination && truck.status === 'delivering') return 'delivering';

    return 'delivering'; // Default for driver view
  };

  if (!myTruck) {
    return (
      <DashboardLayout title="Driver Dashboard" user={currentUser} onLogout={onLogout}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No Truck Assigned</h2>
            <p className="text-muted-foreground">Please contact dispatch for truck assignment</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalFuel = myTruck.compartments.reduce((sum, comp) => sum + comp.currentLevel, 0);
  const totalCapacity = myTruck.compartments.reduce((sum, comp) => sum + comp.capacity, 0);
  const fuelPct = totalCapacity > 0 ? (totalFuel / totalCapacity) * 100 : 0;

  // Live KPIs (driver-focused)
  const kpis = [
    { label: 'Status', value: getDriveDisplayStatus(myTruck).toUpperCase(), color: 'primary' as const },
    { label: 'Fuel', value: `${fuelPct.toFixed(0)}%`, color: fuelPct < 20 ? ('danger' as const) : fuelPct < 50 ? ('warning' as const) : ('success' as const) },
    { label: 'Speed', value: myTruck.telemetry.speed.toFixed(0), unit: 'km/h', color: myTruck.telemetry.speed > 0 ? ('success' as const) : ('secondary' as const) },
    { label: 'Alerts', value: myAlerts.length, color: myAlerts.length > 0 ? ('danger' as const) : ('success' as const) },
  ];

  return (
    <DashboardLayout
      title={`Driver: ${myTruck.name}`}
      user={currentUser}
      onLogout={onLogout}
    >
      {/* 1) Fleet Status (single truck) */}
      <div className="mb-6">
        <FleetStatusSummary trucks={[myTruck]} />
      </div>

      {/* 2) Live KPIs */}
      <div className="mb-6">
        <KPIGrid kpis={kpis} />
      </div>

      {/* 3) Your Fleet Tracking + Active Alerts (side-by-side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map spans 2 columns */}
        <Card className="h-[28rem] min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Current Location
            </CardTitle>
            <CardDescription>Your truck position and route</CardDescription>
          </CardHeader>
          <CardContent className="h-[21rem] overflow-hidden">
            <FleetMap trucks={[myTruck]} userRole="driver" />
          </CardContent>
        </Card>

        {/* Active Alerts beside map */}
        <Card className={`min-w-0 ${myAlerts.length ? 'border-warning/50' : ''}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${myAlerts.length ? 'text-warning' : ''}`}>
              <AlertTriangle className="w-5 h-5" />
              Active Alerts
            </CardTitle>
            {!myAlerts.length && <CardDescription>No active alerts right now</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2 max-h-[22rem] overflow-y-auto">
            {myAlerts.length > 0 ? (
              myAlerts.slice(0, 8).map(alert => (
                <div key={alert.id} className="p-2 bg-warning/10 rounded border border-warning/20">
                  <div className="text-sm font-medium">{alert.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {alert.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">All clear 🚚</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4) REST — arranged for clarity and balance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Current Assignment or Available status */}
          {myTruck.destination ? (
            <Card>
              <CardHeader>
                <CardTitle>Current Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Destination</h3>
                      <p className="text-muted-foreground">{myTruck.destination.name}</p>
                      {myTruck.startPoint && (
                        <p className="text-xs text-muted-foreground">
                          Route: START → {myTruck.destination.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={getDriveDisplayStatus(myTruck)} />
                      <SpeedGauge speed={myTruck.telemetry.speed} size={40} heading={myTruck.telemetry.heading} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {myTruck.compartments.map(comp => {
                      const percentage = (comp.currentLevel / comp.capacity) * 100;
                      const progressColor =
                        percentage > 50 ? 'bg-success' : percentage > 20 ? 'bg-warning' : 'bg-danger';

                      return (
                        <div key={comp.id} className="border border-border rounded-lg p-3 text-center">
                          <div className="text-sm font-medium">{comp.id}</div>
                          <div className="w-full bg-muted-foreground/20 rounded-full h-2 mb-1">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ease-out ${progressColor} ${comp.isOffloading ? 'animate-pulse' : ''}`}
                              style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                            />
                          </div>
                          <div className="text-lg font-bold">{Math.round(comp.currentLevel)}L</div>
                          <div className="text-xs text-muted-foreground">{comp.fuelType}</div>
                          {comp.targetDelivery && (
                            <div className="text-xs text-warning">Target: {comp.targetDelivery}L</div>
                          )}
                          {comp.deliveredLiters && comp.deliveredLiters > 0 && (
                            <div className="text-xs text-success">Delivered: {comp.deliveredLiters}L</div>
                          )}
                          {comp.isOffloading && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Draining
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    {myTruck.status === 'assigned' && (
                      <Button className="flex-1">Start Delivery</Button>
                    )}
                    {myTruck.status === 'delivering' && (
                      <Button variant="outline" className="flex-1">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Offload
                      </Button>
                    )}
                    {myTruck.status === 'completed' && (
                      <Button variant="outline" className="flex-1">Trip Completed</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : myTruck.status === 'idle' ? (
            <Card>
              <CardHeader>
                <CardTitle>Status: Available</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="font-medium mb-2">Ready for Assignment</h3>
                  <p className="text-muted-foreground">Waiting for dispatch to assign next delivery</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Monthly Fuel */}
          <Card className="h-[28rem] min-w-0">
            <CardHeader>
              <CardTitle>Monthly Fuel Consumption</CardTitle>
              <CardDescription>monthly</CardDescription>
            </CardHeader>
            <CardContent className="h-[22rem] w-full overflow-hidden p-0">
              <MonthlyFuelChart trucks={[myTruck]} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Truck Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="w-5 h-5" />
                Truck Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Fuel Level</span>
                    <span>{fuelPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, fuelPct))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <SpeedGauge speed={myTruck.telemetry.speed} size={80} heading={myTruck.telemetry.heading} />
                    <div className="text-xs text-muted-foreground mt-1">Current Speed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{myTruck.telemetry.speed.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">km/h</div>
                    <div className="text-xs text-muted-foreground">
                      {myTruck.telemetry.speed > 0 ? 'Moving' : 'Stationary'}
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{myTruck.telemetry.heading.toFixed(0)}°</div>
                    <div className="text-xs text-muted-foreground">Heading</div>
                    <div className="text-xs text-muted-foreground">
                      {myTruck.telemetry.heading >= 0 && myTruck.telemetry.heading < 45 ? 'N' :
                       myTruck.telemetry.heading >= 45 && myTruck.telemetry.heading < 135 ? 'E' :
                       myTruck.telemetry.heading >= 135 && myTruck.telemetry.heading < 225 ? 'S' :
                       myTruck.telemetry.heading >= 225 && myTruck.telemetry.heading < 315 ? 'W' : 'N'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center mt-4">
                  <div>
                    <div className="text-lg font-bold">{myTruck.telemetry.fuelFlow.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">L/min Flow</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{myTruck.telemetry.tilt.toFixed(1)}°</div>
                    <div className="text-xs text-muted-foreground">Tilt Angle</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Current Location</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {myTruck.position.lat.toFixed(4)}, {myTruck.position.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Valve Status</span>
                    <Badge variant={myTruck.telemetry.valveStatus ? 'destructive' : 'secondary'}>
                      {myTruck.telemetry.valveStatus ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Connection</span>
                    <Badge variant={myTruck.telemetry.online ? 'secondary' : 'destructive'}>
                      {myTruck.telemetry.online ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="destructive" className="w-full">Emergency Stop</Button>
                <Button variant="outline" className="w-full">Contact Dispatch</Button>
                <Button variant="outline" className="w-full">Report Issue</Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(myTruck.logs || [])
                  .sort((a, b) => b.ts.getTime() - a.ts.getTime())
                  .slice(0, 8)
                  .map(log => (
                    <div key={log.id} className="text-xs border-l-2 border-primary pl-2">
                      <div className="text-muted-foreground">
                        {log.ts.toLocaleTimeString()}
                      </div>
                      <div>{log.msg}</div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          {/* Compartment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Compartment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myTruck.compartments.map(comp => {
                  const percentage = (comp.currentLevel / comp.capacity) * 100;
                  const progressColor =
                    percentage > 50 ? 'bg-success' : percentage > 20 ? 'bg-warning' : 'bg-danger';

                  return (
                    <div key={comp.id} className="border border-border rounded p-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{comp.id}</span>
                        <span className="text-sm text-muted-foreground">{comp.fuelType}</span>
                      </div>
                      <div className="w-full bg-muted-foreground/20 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ease-out ${progressColor} ${comp.isOffloading ? 'animate-pulse' : ''}`}
                          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Current:</span>
                        <span>{Math.round(comp.currentLevel)}L</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Capacity:</span>
                        <span>{comp.capacity}L</span>
                      </div>
                      {comp.deliveredLiters && comp.deliveredLiters > 0 && (
                        <div className="flex justify-between text-sm text-success">
                          <span>Delivered:</span>
                          <span>{comp.deliveredLiters}L</span>
                        </div>
                      )}
                      {comp.sealNumber && (
                        <div className="flex justify-between text-sm">
                          <span>Seal:</span>
                          <span className="font-mono">{comp.sealNumber}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DriverDashboard;
