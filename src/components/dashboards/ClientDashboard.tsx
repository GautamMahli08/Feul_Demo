import React, { useState } from 'react';
import { Truck, Alert, UserRole, FuelLossHistory } from '@/types/truck';
import DashboardLayout from './DashboardLayout';
import FleetMap from '../FleetMap';
import KPIGrid from '../KPIGrid';
import FleetStatusSummary from '../FleetStatusSummary';
import MonthlyFuelChart from '../MonthlyFuelChart';
import StatusBadge from '../StatusBadge';
import SpeedGauge from '../SpeedGauge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Truck as TruckIcon, Fuel, MapPin, AlertCircle } from 'lucide-react';

interface ClientDashboardProps {
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

const ClientDashboard = ({
  trucks,
  alerts,
  fuelConsumptionData,
  fuelLossHistory,
  currentUser,
  onLogout,
}: ClientDashboardProps) => {
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());

  // Show all vehicles in the fleet (client scope)
  const clientTrucks = trucks;
  const clientAlerts = alerts;

  const toggleVehicleExpansion = (vehicleId: string) => {
    const next = new Set(expandedVehicles);
    next.has(vehicleId) ? next.delete(vehicleId) : next.add(vehicleId);
    setExpandedVehicles(next);
  };

  const totalOrdered = 15000; // Example value
  const totalDelivered = clientTrucks.reduce(
    (total, truck) =>
      total + truck.compartments.reduce((sum, comp) => sum + (comp.capacity - comp.currentLevel), 0),
    0
  );
  const pendingLiters = Math.max(totalOrdered - totalDelivered, 0);

  const kpis = [
    { label: 'Ordered', value: `${(totalOrdered / 1000).toFixed(1)}K`, unit: 'L', color: 'primary' as const },
    { label: 'Delivered', value: `${(totalDelivered / 1000).toFixed(1)}K`, unit: 'L', color: 'success' as const },
    { label: 'Pending', value: `${(pendingLiters / 1000).toFixed(1)}K`, unit: 'L', color: 'warning' as const },
    { label: 'Incidents', value: clientAlerts.length, color: clientAlerts.length > 0 ? ('danger' as const) : ('success' as const) },
  ];

  // Delivery Verification helpers
  const safeOrdered = Math.max(0, totalOrdered || 0);
  const safeDelivered = Math.max(0, totalDelivered || 0);
  const ratio = safeOrdered > 0 ? safeDelivered / safeOrdered : 0;
  const progressPct = Math.min(Math.max(ratio * 100, 0), 100);
  const variancePct = safeOrdered > 0 ? (((safeDelivered - safeOrdered) / safeOrdered) * 100) : 0;
  const varianceIsSmall = Math.abs(safeOrdered - safeDelivered) < 100;

  return (
    <DashboardLayout title="Client Fleet Dashboard" user={currentUser} onLogout={onLogout}>
      {/* 1) Fleet Status */}
      <div className="mb-6">
        <FleetStatusSummary trucks={clientTrucks} />
      </div>

      {/* 2) Live KPIs */}
      <div className="mb-6">
        <KPIGrid kpis={kpis} />
      </div>

      {/* 3) Your Fleet Tracking + Active Alerts (same row) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map spans 2 columns on large screens */}
        <Card className="h-[30rem] min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Fleet Tracking</CardTitle>
            <CardDescription>Track deliveries to your stations</CardDescription>
          </CardHeader>
          <CardContent className="h-[23rem] overflow-hidden">
            <div className="h-full w-full">
              <FleetMap trucks={clientTrucks} userRole="client" />
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts beside the map */}
        <Card className={`min-w-0 ${clientAlerts.length ? 'border-warning/50' : ''}`}>
          <CardHeader>
            <CardTitle className={clientAlerts.length ? 'text-warning' : ''}>Active Alerts</CardTitle>
            {!clientAlerts.length && <CardDescription>No active alerts right now</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2 max-h-[26rem] overflow-y-auto">
            {clientAlerts.length > 0 ? (
              clientAlerts.slice(0, 8).map((alert) => (
                <div key={alert.id} className="text-sm p-2 bg-warning/10 rounded border border-warning/20">
                  <div className="font-medium">{alert.message}</div>
                  <div className="text-xs text-muted-foreground">{alert.timestamp.toLocaleTimeString()}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">All clear 🚀</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4) REST ALL — balanced in two rows */}
      {/* Row A: Delivery Verification ⟷ Monthly Fuel Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Expected:</span>
                <span className="font-medium">{(safeOrdered / 1000).toFixed(1)}K L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Delivered:</span>
                <span className="font-medium text-success">{(safeDelivered / 1000).toFixed(1)}K L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Variance:</span>
                <span className={`font-medium ${varianceIsSmall ? 'text-success' : 'text-warning'}`}>
                  {variancePct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-4 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${ratio >= 1 ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {ratio > 1 && (
                <div className="text-xs text-warning mt-1">
                  Over by {((ratio - 1) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-[30rem] min-w-0">
          <CardHeader>
            <CardTitle>Monthly Fuel Consumption</CardTitle>
            <CardDescription>monthly</CardDescription>
          </CardHeader>
          <CardContent className="h-[25rem] w-full overflow-hidden p-0">
            <div className="h-full w-full">
              <MonthlyFuelChart trucks={clientTrucks} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row B: Recent Fuel Events ⟷ Request Delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Fuel Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clientTrucks
                .flatMap(truck => (truck.logs || []).map(log => ({ ...log, truckName: truck.name })))
                .sort((a, b) => b.ts.getTime() - a.ts.getTime())
                .slice(0, 10)
                .map(log => (
                  <div key={log.id} className="text-xs border-l-2 border-primary pl-2">
                    <div className="text-muted-foreground">
                      {log.ts.toLocaleTimeString()} — {log.truckName}
                    </div>
                    <div>{log.msg}</div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Fuel Type</label>
                <select className="w-full mt-1 p-2 bg-background border border-border rounded">
                  <option>Diesel</option>
                  <option>Petrol</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity (L)</label>
                <input
                  type="number"
                  className="w-full mt-1 p-2 bg-background border border-border rounded"
                  placeholder="5000"
                />
              </div>
              <Button className="w-full" variant="outline">
                Request Delivery
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Vehicles (full width at the end) */}
      <Card>
        <CardHeader>
          <CardTitle>All Vehicles</CardTitle>
          <CardDescription>Complete fleet overview with detailed information</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Fuel Flow</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientTrucks.map(truck => {
                const isExpanded = expandedVehicles.has(truck.id);
                const vehicleAlerts = alerts.filter(alert => alert.truckId === truck.id);

                return (
                  <React.Fragment key={truck.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleVehicleExpansion(truck.id)}>
                      <TableCell>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TruckIcon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{truck.name}</div>
                            <div className="text-xs text-muted-foreground">{truck.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{truck.driver}</TableCell>
                      <TableCell>
                        <StatusBadge status={truck.telemetry.online ? truck.status : 'offline'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SpeedGauge speed={truck.telemetry.speed} size={24} heading={truck.telemetry.heading} />
                          <span className="text-sm">{truck.telemetry.speed} km/h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Fuel className="h-3 w-3" />
                          <span className="text-sm">{truck.telemetry.fuelFlow.toFixed(1)} L/h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {truck.position.lat.toFixed(4)}, {truck.position.lng.toFixed(4)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="text-sm">{truck.destination?.name || 'No destination'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vehicleAlerts.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {vehicleAlerts.length}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        {/* Match header count: 9 */}
                        <TableCell colSpan={9} className="p-0">
                          <div className="p-4 bg-muted/30 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Compartments */}
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Compartments</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  {truck.compartments.map(comp => {
                                    const percentage = comp.capacity > 0 ? (comp.currentLevel / comp.capacity) * 100 : 0;
                                    const progressColor =
                                      percentage > 50 ? 'bg-success' : percentage > 20 ? 'bg-warning' : 'bg-danger';
                                    return (
                                      <div key={comp.id} className="p-2 bg-background rounded border">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-medium">{comp.id}</span>
                                          <span className="text-xs text-muted-foreground">{comp.fuelType}</span>
                                        </div>
                                        <div className="w-full bg-muted-foreground/20 rounded-full h-2 mb-1 overflow-hidden">
                                          <div
                                            className={`h-2 rounded-full transition-all duration-500 ${progressColor} ${comp.isOffloading ? 'animate-pulse' : ''}`}
                                            style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                                          />
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span>{Math.round(comp.currentLevel)}L / {comp.capacity}L</span>
                                          {comp.isOffloading && <span className="text-warning">Draining</span>}
                                        </div>
                                        {comp.targetDelivery && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            Target: {comp.targetDelivery}L
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </CardContent>
                              </Card>

                              {/* Current Assignment */}
                              {truck.currentAssignment && (
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Current Assignment</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Assigned:</span>
                                        <span className="font-medium">{truck.currentAssignment.assignedLiters}L</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Started:</span>
                                        <span className="text-muted-foreground">
                                          {truck.currentAssignment.startedAt.toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Loss:</span>
                                        <span className={truck.currentAssignment.provisionalLossLiters > 0 ? 'text-warning' : 'text-success'}>
                                          {truck.currentAssignment.provisionalLossLiters}L
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Telemetry */}
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Telemetry</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span>Speed:</span>
                                      <span className="font-medium">{truck.telemetry.speed} km/h</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Fuel Flow:</span>
                                      <span className="font-medium">{truck.telemetry.fuelFlow.toFixed(1)} L/h</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Tilt:</span>
                                      <span className="font-medium">{truck.telemetry.tilt}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Valve:</span>
                                      <Badge variant={truck.telemetry.valveStatus ? 'default' : 'secondary'} className="text-xs">
                                        {truck.telemetry.valveStatus ? 'Open' : 'Closed'}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Online:</span>
                                      <Badge variant={truck.telemetry.online ? 'default' : 'destructive'} className="text-xs">
                                        {truck.telemetry.online ? 'Yes' : 'No'}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Last Update:</span>
                                      <span className="text-muted-foreground text-xs">
                                        {truck.telemetry.lastUpdate.toLocaleTimeString()}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Active Alerts per vehicle */}
                              {vehicleAlerts.length > 0 && (
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4 text-warning" />
                                      Active Alerts
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      {vehicleAlerts.slice(0, 3).map(alert => (
                                        <div key={alert.id} className="p-2 bg-warning/10 rounded border border-warning/20">
                                          <div className="text-xs font-medium">{alert.message}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {alert.timestamp.toLocaleTimeString()}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default ClientDashboard;
