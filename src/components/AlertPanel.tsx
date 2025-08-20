import React from 'react';
import { Alert } from '@/types/truck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shield, 
  WifiOff, 
  RotateCcw, 
  Settings,
  MapPin
} from 'lucide-react';

interface AlertPanelProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  showAll?: boolean;
}

const AlertPanel = ({ alerts, onAcknowledge, showAll = false }: AlertPanelProps) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'theft':
        return <Shield className="w-4 h-4" />;
      case 'tampering':
        return <Settings className="w-4 h-4" />;
      case 'offline':
        return <WifiOff className="w-4 h-4" />;
      case 'tilt':
        return <RotateCcw className="w-4 h-4" />;
      case 'route_deviation':
        return <MapPin className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const displayedAlerts = showAll ? alerts : alerts.slice(0, 5);

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <Shield className="w-5 h-5" />
            All Clear
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">No active alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="w-5 h-5" />
          Active Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {displayedAlerts.map(alert => (
            <div 
              key={alert.id} 
              className={`p-3 rounded-lg border transition-all duration-300 ${
                alert.acknowledged 
                  ? 'bg-muted/50 border-border opacity-60' 
                  : `bg-${getSeverityColor(alert.severity)}/10 border-${getSeverityColor(alert.severity)}/20`
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <div className={`mt-0.5 ${alert.acknowledged ? 'text-muted-foreground' : `text-${getSeverityColor(alert.severity)}`}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${alert.acknowledged ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${alert.acknowledged ? 'text-muted-foreground' : `text-${getSeverityColor(alert.severity)}`}`}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {!alert.acknowledged && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAcknowledge(alert.id)}
                    className="shrink-0 text-xs px-2 py-1 h-auto"
                  >
                    Ack
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {!showAll && alerts.length > 5 && (
            <div className="text-center pt-2">
              <span className="text-xs text-muted-foreground">
                +{alerts.length - 5} more alerts
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertPanel;