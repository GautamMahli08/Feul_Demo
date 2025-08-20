import React, { useMemo, useState } from 'react';
import { Truck, Alert, UserRole, FuelLossHistory } from '@/types/truck';
import DashboardLayout from './DashboardLayout';
import FleetMap from '../FleetMap';
import AlertPanel from '../AlertPanel';
import FleetStatusSummary from '../FleetStatusSummary';
import MonthlyFuelChart from '../MonthlyFuelChart';
import CompartmentLevelBar from '../CompartmentLevelBar';
import KPIGrid from '../KPIGrid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation, Phone, Lock, Route, Download, FileText } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { exportToCSV, printFuelLossReport } from '@/utils/export';
import { format } from 'date-fns';

// ✅ Use relative path to geofence helpers (fixes Vite alias error)
import { GEOFENCE_ZONES, haversineDistanceMeters } from '../../data/geofences';

interface OperatorDashboardProps {
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

// Simple centroid for small polygons
function centroidLatLng(poly: { lat: number; lng: number }[]) {
  if (!poly?.length) return { lat: 0, lng: 0 };
  const sum = poly.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / poly.length, lng: sum.lng / poly.length };
}

const OperatorDashboard = ({
  trucks,
  alerts,
  fuelConsumptionData,
  fuelLossHistory,
  acknowledgeAlert,
  assignTrip,
  currentUser,
  onLogout,
}: OperatorDashboardProps) => {
  const [selectedTruck, setSelectedTruck] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Build destinations from Muscat geofences (exclude danger zones)
  const destinations = useMemo(
    () =>
      GEOFENCE_ZONES.filter(z => z.type === 'depot' || z.type === 'delivery').map(z => {
        const point =
          z.shape === 'circle' && z.center
            ? z.center
            : z.shape === 'polygon' && z.polygon
            ? centroidLatLng(z.polygon)
            : { lat: 0, lng: 0 };
        return { id: z.id, name: z.name, lat: point.lat, lng: point.lng };
      }),
    []
  );

  const availableTrucks = trucks.filter(truck => truck.status === 'idle');
  const activeTrucks = trucks.filter(truck => ['delivering', 'assigned'].includes(truck.status));
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  const handleAssignTrip = () => {
    if (selectedTruck && selectedDestination) {
      const destination = destinations.find(d => d.id === selectedDestination);
      const truck = trucks.find(t => t.id === selectedTruck);
      if (destination && truck) {
        // Sanity check: avoid accidental cross-country assignments
        const dist = haversineDistanceMeters(
          { lat: truck.position.lat, lng: truck.position.lng },
          { lat: destination.lat, lng: destination.lng }
        );
        if (dist > 120_000 && typeof window !== 'undefined') {
          const km = Math.round(dist / 1000);
          const ok = window.confirm(`This trip is ~${km} km away. Assign anyway?`);
          if (!ok) return;
        }

        assignTrip(selectedTruck, destination);
        setSelectedTruck('');
        setSelectedDestination('');
      }
    }
  };

  const handleExportCSV = () => {
    exportToCSV(fuelLossHistory, `fuel-loss-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const handlePrintReport = () => {
    printFuelLossReport(fuelLossHistory);
  };

  // KPI helpers
  const statusCounts = {
    all: trucks.length,
    idle: trucks.filter(t => t.status === 'idle').length,
    delivering: trucks.filter(t => t.status === 'delivering').length,
    assigned: trucks.filter(t => t.status === 'assigned').length,
    uplifting: trucks.filter(t => t.status === 'uplifting').length,
    offline: trucks.filter(t => !t.telemetry.online).length,
    completed: trucks.filter(t => t.status === 'completed').length,
  };
  const kpis = [
    { label: 'Active', value: statusCounts.delivering + statusCounts.assigned + statusCounts.uplifting, color: 'primary' as const },
    { label: 'Idle', value: statusCounts.idle, color: 'secondary' as const },
    { label: 'Offline', value: statusCounts.offline, color: 'warning' as const },
    { label: 'Incidents', value: unacknowledgedAlerts.length, color: unacknowledgedAlerts.length ? ('danger' as const) : ('success' as const) },
  ];

  // Fuel loss aggregates (placeholder if needed later)
  const truckLossCounts = fuelLossHistory.reduce((acc, loss) => {
    acc[loss.truckId] = (acc[loss.truckId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const trucksWithRepeatedLosses = Object.entries(truckLossCounts)
    .filter(([_, count]) => count > 2)
    .sort(([, a], [, b]) => b - a);

  // Status filter
  const filteredTrucks = statusFilter === 'all' ? trucks : trucks.filter(truck => truck.status === statusFilter);

  const handleAssignFromStatus = (truckId: string) => {
    setSelectedTruck(truckId);
    const el = document.getElementById('trip-assignment');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <DashboardLayout title="Operations Control Center" user={currentUser} onLogout={onLogout}>
      {/* 1) Fleet Status (full width) */}
      <div className="mb-6">
        <FleetStatusSummary trucks={trucks} />
      </div>

      {/* 2) Live KPIs (full width) */}
      <div className="mb-6">
        <KPIGrid kpis={kpis} />
      </div>

      {/* 3) Your Fleet Tracking + Active Alerts (equal heights) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map */}
        <Card className="h-[30rem] min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Your Fleet Tracking
            </CardTitle>
            <CardDescription>Monitor routes and assign deliveries</CardDescription>
          </CardHeader>
          <CardContent className="h-[23rem] overflow-hidden">
            <FleetMap trucks={trucks} userRole="operator" />
          </CardContent>
        </Card>

        {/* Alerts (same height as map) */}
        <Card className="h-[30rem] min-w-0">
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>Unacknowledged incidents</CardDescription>
          </CardHeader>
          <CardContent className="h-[23rem] overflow-y-auto">
            <AlertPanel alerts={unacknowledgedAlerts} onAcknowledge={acknowledgeAlert} showAll={true} />
          </CardContent>
        </Card>
      </div>

      {/* Row A: Monthly Fuel ⟷ Vehicle Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="h-[30rem] min-w-0">
          <CardHeader>
            <CardTitle>Monthly Fuel Consumption</CardTitle>
            <CardDescription>Monthly</CardDescription>
          </CardHeader>
          <CardContent className="h-[25rem] w-full overflow-hidden p-0">
            <MonthlyFuelChart trucks={trucks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Status Overview</CardTitle>
            <CardDescription>Filter vehicles by status to monitor fleet availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'idle', label: 'Idle' },
                  { key: 'delivering', label: 'Delivering' },
                  { key: 'assigned', label: 'Assigned' },
                  { key: 'uplifting', label: 'Uplifting' },
                  { key: 'offline', label: 'Offline' },
                  { key: 'completed', label: 'Completed' },
                ].map(status => (
                  <Button
                    key={status.key}
                    variant={statusFilter === status.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status.key)}
                    className="text-xs"
                  >
                    {status.label} ({statusCounts[status.key as keyof typeof statusCounts]})
                  </Button>
                ))}
              </div>

              {/* Status Table */}
              <div className="border rounded-lg">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Vehicle</th>
                        <th className="text-left p-2 font-medium">Driver</th>
                        <th className="text-left p-2 font-medium">Client</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Speed</th>
                        <th className="text-left p-2 font-medium">Location</th>
                        <th className="text-right p-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrucks.map(truck => (
                        <tr key={truck.id} className="border-t hover:bg-muted/50">
                          <td className="p-2 font-medium">{truck.name}</td>
                          <td className="p-2 text-muted-foreground">{truck.driver}</td>
                          <td className="p-2 text-muted-foreground">{truck.client}</td>
                          <td className="p-2">
                            <StatusBadge status={truck.telemetry.online ? truck.status : 'offline'} />
                          </td>
                          <td className="p-2 text-muted-foreground">{truck.telemetry.speed.toFixed(0)} km/h</td>
                          <td className="p-2 text-muted-foreground text-xs">
                            {truck.position.lat.toFixed(4)}, {truck.position.lng.toFixed(4)}
                          </td>
                          <td className="p-2 text-right">
                            {truck.status === 'idle' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAssignFromStatus(truck.id)}
                                className="text-xs"
                              >
                                Assign
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {format(truck.telemetry.lastUpdate, 'HH:mm')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredTrucks.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No vehicles found with status: {statusFilter}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row B: Trip Results & Fuel Loss */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Trip Results & Fuel Loss Analysis
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintReport}>
                  <FileText className="w-4 h-4 mr-2" />
                  Print Report
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add your existing trip results content here */}
          </CardContent>
        </Card>
      </div>

      {/* Row C: Trip Assignment ⟷ Active Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trip Assignment */}
        <Card id="trip-assignment">
          <CardHeader>
            <CardTitle>Assign New Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Truck</label>
                <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTrucks.map(truck => (
                      <SelectItem key={truck.id} value={truck.id}>
                        {truck.name} - {truck.driver}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Destination</label>
                <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose destination (Muscat zones)" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map(dest => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleAssignTrip}
                  disabled={!selectedTruck || !selectedDestination}
                  className="w-full"
                >
                  Assign Trip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Trips */}
        <Card>
          <CardHeader>
            <CardTitle>Active Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTrucks.map(truck => (
                <div key={truck.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{truck.name}</h4>
                      <p className="text-sm text-muted-foreground">Driver: {truck.driver}</p>
                      {truck.destination && truck.startPoint && (
                        <p className="text-xs text-muted-foreground">Route: START → {truck.destination.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={truck.telemetry.online ? truck.status : 'offline'} />
                      <Badge variant="secondary">{truck.telemetry.speed.toFixed(0)} km/h</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {truck.compartments.map(comp => (
                      <div key={comp.id} className="text-center p-2 bg-muted rounded">
                        <div className="text-xs text-muted-foreground">{comp.id}</div>
                        <div className="mb-1">
                          <CompartmentLevelBar
                            currentLevel={comp.currentLevel}
                            capacity={comp.capacity}
                            isOffloading={comp.isOffloading}
                            className="h-2"
                          />
                        </div>
                        <div className="font-medium text-xs">{Math.round(comp.currentLevel)}L</div>
                        {comp.isOffloading && <div className="text-xs text-warning">Draining</div>}
                        {comp.targetDelivery && (
                          <div className="text-xs text-muted-foreground">Target: {comp.targetDelivery}L</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Call Driver
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      Reroute
                    </Button>
                    <Button variant="destructive" size="sm" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Emergency Stop
                    </Button>
                  </div>
                </div>
              ))}
              {activeTrucks.length === 0 && (
                <div className="text-sm text-muted-foreground">No active trips right now.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OperatorDashboard;
