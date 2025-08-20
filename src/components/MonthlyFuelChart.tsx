import React, { useState, useMemo } from 'react';
import { Truck } from '@/types/truck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface MonthlyFuelChartProps {
  trucks: Truck[];
}

const MonthlyFuelChart = ({ trucks }: MonthlyFuelChartProps) => {
  const [viewMode, setViewMode] = useState<'fleet' | string>('fleet');

  const chartData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map((day, index) => {
      const dayLabel = format(day, 'd');

      if (viewMode === 'fleet') {
        const base = 2800 + Math.sin(index * 0.3) * 400;
        const jitter = (Math.random() - 0.5) * 600;
        const weekend = [0, 6].includes(day.getDay()) ? -300 : 0;
        return { day: dayLabel, fuel: Math.max(1800, Math.round(base + jitter + weekend)) };
      } else {
        const base = 280 + Math.sin(index * 0.4) * 50;
        const jitter = (Math.random() - 0.5) * 80;
        const weekend = [0, 6].includes(day.getDay()) ? -40 : 0;
        return { day: dayLabel, fuel: Math.max(150, Math.round(base + jitter + weekend)) };
      }
    });
  }, [viewMode, trucks]);

  const selectedTruckName =
    viewMode === 'fleet' ? 'Fleet Total' : trucks.find(t => t.id === viewMode)?.name || 'Select Truck';

  return (
    <Card className="overflow-hidden rounded-xl"> {/* clip at card edges */}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Monthly Fuel Consumption
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {selectedTruckName}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setViewMode('fleet')}>Fleet Total</DropdownMenuItem>
              {trucks.map(truck => (
                <DropdownMenuItem key={truck.id} onClick={() => setViewMode(truck.id)}>
                  {truck.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* fixed height + rounded + hard clip so SVG can’t bleed */}
        <div className="h-72 w-full rounded-xl overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 16, bottom: 8, left: 12 }} // inner padding
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                label={{ value: 'Liters', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6
                }}
                formatter={(value) => [`${value}L`, 'Fuel Consumed']}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Line
                type="monotone"
                dataKey="fuel"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyFuelChart;
