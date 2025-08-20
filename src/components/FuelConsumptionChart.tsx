import React, { useEffect, useRef, useState } from 'react';
import { Truck } from '@/types/truck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface FuelConsumptionChartProps {
  trucks: Truck[];
  fuelConsumptionData: Array<{ timestamp: Date; truckId: string; liters: number }>;
}

declare global {
  interface Window {
    Chart: any;
  }
}

const FuelConsumptionChart = ({ trucks, fuelConsumptionData }: FuelConsumptionChartProps) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'fleet' | string>('fleet');
  const [selectedTruck, setSelectedTruck] = useState<string>('');

  useEffect(() => {
    if (!chartRef.current || !window.Chart) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const labels: string[] = [];
    const dailyData: { [key: string]: number } = {};

    daysInMonth.forEach(day => {
      const label = format(day, 'd');
      labels.push(label);
      dailyData[label] = 0;
    });

    let chartData;
    let chartLabel;

    if (viewMode === 'fleet') {
      fuelConsumptionData
        ?.filter(d => d.timestamp >= monthStart && d.timestamp <= monthEnd)
        .forEach(data => {
          const day = format(data.timestamp, 'd');
          if (dailyData[day] !== undefined) dailyData[day] += data.liters;
        });
      chartData = labels.map(label => dailyData[label]);
      chartLabel = 'Fleet Total (Liters)';
    } else {
      fuelConsumptionData
        ?.filter(d => d.timestamp >= monthStart && d.timestamp <= monthEnd && d.truckId === viewMode)
        .forEach(data => {
          const day = format(data.timestamp, 'd');
          if (dailyData[day] !== undefined) dailyData[day] += data.liters;
        });
      chartData = labels.map(label => dailyData[label]);
      const truck = trucks.find(t => t.id === viewMode);
      chartLabel = `${truck?.name || 'Unknown'} (Liters)`;
    }

    chartInstanceRef.current = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: chartLabel,
          data: chartData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 8, right: 12, bottom: 8, left: 12 } // ✅ keeps it inside frame
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Liters Consumed' },
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
          },
          x: {
            title: { display: true, text: 'Day (This Month)' },
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
          }
        },
        plugins: {
          legend: { display: true, position: 'top' as const },
          tooltip: { mode: 'index' as const, intersect: false }
        },
        interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
      }
    });

    return () => chartInstanceRef.current?.destroy();
  }, [viewMode, fuelConsumptionData, trucks]);

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode);
    if (mode !== 'fleet') setSelectedTruck(mode);
  };

  return (
    <Card className="overflow-hidden"> {/* ✅ Clip children to card frame */}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-4" />
            Monthly Fuely Consumption
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {viewMode === 'fleet' ? 'Fleet Total' : trucks.find(t => t.id === viewMode)?.name || 'Select Truck'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleViewModeChange('fleet')}>
                Fleet Total
              </DropdownMenuItem>
              {trucks.map(truck => (
                <DropdownMenuItem key={truck.id} onClick={() => handleViewModeChange(truck.id)}>
                  {truck.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {/* ✅ chart container also clipped & rounded */}
        <div className="h-40 w-full rounded-xl overflow-hidden">
          <canvas ref={chartRef} />
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelConsumptionChart;
