import React from 'react';
import { Truck, Alert, FuelLossHistory } from '@/types/truck';
import { UserRole } from '@/types/truck';
import DashboardLayout from './DashboardLayout';
import FleetMap from '../FleetMap';
import AlertPanel from '../AlertPanel';
import FleetStatusSummary from '../FleetStatusSummary';
import MonthlyFuelChart from '../MonthlyFuelChart';
import StatusBadge from '../StatusBadge';
import SpeedGauge from '../SpeedGauge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Activity, DollarSign, Download, FileText } from 'lucide-react';
import { exportToCSV, printFuelLossReport } from '@/utils/export';
import { format } from 'date-fns';

interface ManagerDashboardProps {
  trucks: Truck[];
  alerts: Alert[];
  totalSavings: number;
  fuelConsumptionData: Array<{ timestamp: Date; truckId: string; liters: number }>;
  fuelLossHistory: FuelLossHistory[];
  acknowledgeAlert: (alertId: string) => void;
  assignTrip: (truckId: string, destination: { lat: number; lng: number; name: string }) => void;
  currentUser: { role: UserRole; name: string };
  onLogout: () => void;
}

const ManagerDashboard = ({
  trucks,
  alerts,
  totalSavings,
  fuelLossHistory,
  fuelConsumptionData,
  acknowledgeAlert,
  currentUser,
  onLogout,
}: ManagerDashboardProps) => {
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <DashboardLayout
      title="Fleet Management Center"
      user={currentUser}
      onLogout={onLogout}
    >
      {/* 1) Fleet Status */}
      <div className="mb-6">
        <FleetStatusSummary trucks={trucks} />
      </div>

      {/* 2) Live Fleet Tracking + Active Alerts (equal height cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map spans 2/3 */}
        <Card className="h-[30rem] min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Fleet Tracking
            </CardTitle>
            <CardDescription>Real-time positions and delivery status</CardDescription>
          </CardHeader>
          <CardContent className="h-[23rem] overflow-hidden">
            <FleetMap trucks={trucks} userRole="manager" />
          </CardContent>
        </Card>

        {/* Active Alerts beside the map (same height) */}
        <Card className="h-[30rem] min-w-0">
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>Unacknowledged events</CardDescription>
          </CardHeader>
          <CardContent className="h-[23rem] overflow-y-auto">
            <AlertPanel
              alerts={unacknowledgedAlerts}
              onAcknowledge={acknowledgeAlert}
              showAll={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* ===== REST — balanced two-column rows ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Live Savings (USD) */}
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-600" />
                Live Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-700 animate-pulse">
                ${totalSavings.toLocaleString()}
              </div>
              <div className="text-sm text-yellow-600/80">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                +${Math.floor(Math.random() * 1000)} this hour
              </div>
            </CardContent>
          </Card>

          {/* Active Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle>Active Deliveries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trucks.filter(t => t.status === 'delivering').map(truck => (
                <div key={truck.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium">{truck.name}</div>
                      <div className="text-sm text-muted-foreground">{truck.driver}</div>
                      {truck.destination && truck.startPoint && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Route: START → {truck.destination.name}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={truck.telemetry.online ? truck.status : 'offline'} />
                  </div>

                  <div className="flex items-center justify-between">
                    <SpeedGauge
                      speed={truck.telemetry.speed}
                      size={60}
                      heading={truck.telemetry.heading}
                    />
                    <div className="text-right text-sm">
                      <div>Tilt: {truck.telemetry.tilt.toFixed(1)}°</div>
                      <div>Valve: {truck.telemetry.valveStatus ? 'Open' : 'Closed'}</div>
                    </div>
                  </div>

                  {/* Simple compartment progress */}
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    {truck.compartments.map(comp => {
                      const percentage = (comp.currentLevel / comp.capacity) * 100;
                      const progressColor =
                        percentage > 50 ? 'bg-success' : percentage > 20 ? 'bg-warning' : 'bg-destructive';
                      return (
                        <div key={comp.id} className="text-center">
                          <div className="text-xs">{comp.id}</div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${progressColor} ${
                                comp.isOffloading ? 'animate-pulse' : ''
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                            />
                          </div>
                          <div className="text-xs">{Math.round(comp.currentLevel)}L</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {trucks.filter(t => t.status === 'delivering').length === 0 && (
                <div className="text-sm text-muted-foreground">No active deliveries right now.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Monthly Fuel */}
          <Card className="h-[30rem] min-w-0">
            <CardHeader>
              <CardTitle>Monthly Fuel Consumption</CardTitle>
              <CardDescription>monthly</CardDescription>
            </CardHeader>
            <CardContent className="h-[25rem] w-full overflow-hidden p-0">
              <MonthlyFuelChart trucks={trucks} />
            </CardContent>
          </Card>

          {/* Fuel Loss Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Fuel Loss Report
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCSV(
                        fuelLossHistory,
                        `fuel-loss-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => printFuelLossReport(fuelLossHistory)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Print Report
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>Latest loss incidents and summaries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Use the controls above to export a full report. Recent incidents are visible in Alerts and per-truck logs.
              </div>
            </CardContent>
          </Card>

          {/* All Vehicles Overview */}
          <Card>
            <CardHeader>
              <CardTitle>All Vehicles</CardTitle>
              <CardDescription>Complete fleet status overview</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <th className="text-left p-2 font-medium">Last Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trucks.map(truck => (
                        <tr key={truck.id} className="border-t hover:bg-muted/50">
                          <td className="p-2 font-medium">{truck.name}</td>
                          <td className="p-2 text-muted-foreground">{truck.driver}</td>
                          <td className="p-2 text-muted-foreground">{truck.client}</td>
                          <td className="p-2">
                            <StatusBadge status={truck.telemetry.online ? truck.status : 'offline'} />
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {truck.telemetry.online ? `${truck.telemetry.speed} km/h` : '—'}
                          </td>
                          <td className="p-2 text-muted-foreground text-xs">
                            {truck.position.lat.toFixed(4)}, {truck.position.lng.toFixed(4)}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {truck.telemetry.online
                              ? format(truck.telemetry.lastUpdate, 'HH:mm:ss')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
