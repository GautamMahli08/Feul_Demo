import React from 'react';
import { cn } from '@/lib/utils';

interface CompartmentLevelBarProps {
  currentLevel: number;
  capacity: number;
  isOffloading?: boolean;
  className?: string;
}

const CompartmentLevelBar = ({ 
  currentLevel, 
  capacity, 
  isOffloading = false, 
  className 
}: CompartmentLevelBarProps) => {
  const percentage = Math.max(0, Math.min(100, (currentLevel / capacity) * 100));
  
  return (
    <div className={cn("relative h-4 w-full bg-secondary rounded-full overflow-hidden", className)}>
      {/* Base fuel level */}
      <div 
        className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
        style={{ width: `${percentage}%` }}
      />
      
      {/* Draining animation overlay */}
      {isOffloading && percentage > 0 && (
        <>
          {/* Shimmer effect during draining */}
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
            style={{ width: `${percentage}%` }}
          />
          
          {/* Flow indicator */}
          <div 
            className="absolute top-0 h-full bg-gradient-to-r from-primary/60 to-primary/20 animate-pulse"
            style={{ 
              width: `${percentage}%`,
              animation: 'flow 2s ease-in-out infinite'
            }}
          />
          
          {/* Draining particles effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute h-1 w-1 bg-primary/60 rounded-full animate-bounce"
                style={{
                  left: `${Math.min(percentage - 5, 85)}%`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Level indicator text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-foreground/80 drop-shadow-sm">
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <style>{`
        @keyframes flow {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default CompartmentLevelBar;