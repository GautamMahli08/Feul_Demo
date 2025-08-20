import React from 'react';
import { Truck } from '@/types/truck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck as TruckIcon, Activity, AlertTriangle, Zap } from 'lucide-react';

interface FleetStatusSummaryProps {
  trucks: Truck[];
}

const FleetStatusSummary = ({ trucks }: FleetStatusSummaryProps) => {
  const totalTrucks = trucks.length;
  const activeTrucks = trucks.filter(t => t.status === 'delivering' || t.status === 'assigned').length;
  const offlineTrucks = trucks.filter(t => !t.telemetry.online).length;
  const idleTrucks = trucks.filter(t => t.status === 'idle').length;
  const assignedTrucks = trucks.filter(t => t.status === 'assigned').length;
  const upliftingTrucks = trucks.filter(t => t.status === 'uplifting').length;
  const completedTrucks = trucks.filter(t => t.status === 'completed').length;

  const activeOnlineTrucks = trucks.filter(t => t.telemetry.online && (t.status === 'delivering' || t.status === 'assigned'));
  const avgSpeed = activeOnlineTrucks.length > 0 
    ? activeOnlineTrucks.reduce((sum, t) => sum + t.telemetry.speed, 0) / activeOnlineTrucks.length
    : 0;

  const securityUptime = ((totalTrucks - offlineTrucks) / totalTrucks) * 100;
  const theftRate = 0.03; // Simulated
  const monthlyLiters = trucks.reduce((total, truck) => 
    total + truck.compartments.reduce((sum, comp) => sum + comp.currentLevel, 0), 0
  );

  return (
    <div className="space-y-4">
      {/* Fleet Counters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="w-5 h-5" />
            Fleet Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalTrucks}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeTrucks}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{offlineTrucks}</div>
              <div className="text-sm text-muted-foreground">Offline</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{idleTrucks}</div>
              <div className="text-sm text-muted-foreground">Idle</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Assigned: {assignedTrucks}
              </Badge>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Uplifting: {upliftingTrucks}
              </Badge>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                Completed: {completedTrucks}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Row */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live KPIs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{avgSpeed.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Speed (km/h)</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{securityUptime.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Security Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{theftRate}%</div>
              <div className="text-sm text-muted-foreground">Theft Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{Math.round(monthlyLiters / 1000)}K</div>
              <div className="text-sm text-muted-foreground">Monthly Liters</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetStatusSummary;