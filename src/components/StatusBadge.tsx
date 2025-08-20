import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'idle' | 'assigned' | 'delivering' | 'completed' | 'uplifting' | 'offline' | 'draining';
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'idle':
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-300',
          text: 'Idle'
        };
      case 'assigned':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-300',
          text: 'Assigned'
        };
      case 'delivering':
        return {
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-300',
          text: 'Delivering'
        };
      case 'uplifting':
        return {
          variant: 'secondary' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-300',
          text: 'Uplifting'
        };
      case 'draining':
        return {
          variant: 'secondary' as const,
          className: 'bg-amber-100 text-amber-800 border-amber-300',
          text: 'Draining'
        };
      case 'completed':
        return {
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-300',
          text: 'Busy'
        };
      case 'offline':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-300',
          text: 'Offline'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-300',
          text: status
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.text}
    </Badge>
  );
};

export default StatusBadge;