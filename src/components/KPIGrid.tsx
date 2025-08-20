import React from 'react';
import { KPI } from '@/types/truck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIGridProps {
  kpis: KPI[];
}

const KPIGrid = ({ kpis }: KPIGridProps) => {
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-danger" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getValueColor = (color?: string) => {
    switch (color) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-danger';
      case 'primary':
        return 'text-primary';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="hover:shadow-glow transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              {kpi.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${getValueColor(kpi.color)}`}>
                  {kpi.value}
                </span>
                {kpi.unit && (
                  <span className="text-sm text-muted-foreground">{kpi.unit}</span>
                )}
              </div>
              {kpi.trend && (
                <div className="flex items-center">
                  {getTrendIcon(kpi.trend)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPIGrid;