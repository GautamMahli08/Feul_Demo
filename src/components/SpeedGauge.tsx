import React from 'react';

interface SpeedGaugeProps {
  speed: number;
  maxSpeed?: number;
  size?: number;
  heading?: number;
}

const SpeedGauge = ({ speed, maxSpeed = 120, size = 80, heading }: SpeedGaugeProps) => {
  const angle = Math.min((speed / maxSpeed) * 270, 270) - 135; // -135 to 135 degrees
  const radius = (size - 20) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Calculate needle position
  const needleLength = radius * 0.8;
  const needleX = centerX + needleLength * Math.cos((angle * Math.PI) / 180);
  const needleY = centerY + needleLength * Math.sin((angle * Math.PI) / 180);

  // Create arc path for the gauge background
  const createArcPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + outerRadius * Math.cos(startAngleRad);
    const y1 = centerY + outerRadius * Math.sin(startAngleRad);
    const x2 = centerX + outerRadius * Math.cos(endAngleRad);
    const y2 = centerY + outerRadius * Math.sin(endAngleRad);
    
    const x3 = centerX + innerRadius * Math.cos(endAngleRad);
    const y3 = centerY + innerRadius * Math.sin(endAngleRad);
    const x4 = centerX + innerRadius * Math.cos(startAngleRad);
    const y4 = centerY + innerRadius * Math.sin(startAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  };

  const speedColor = speed > 80 ? '#ef4444' : speed > 50 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="drop-shadow-sm">
        {/* Background arc */}
        <path
          d={createArcPath(-135, 135, radius * 0.7, radius)}
          fill="hsl(var(--muted))"
          opacity="0.3"
        />
        
        {/* Speed arc */}
        <path
          d={createArcPath(-135, angle, radius * 0.7, radius)}
          fill={speedColor}
          opacity="0.8"
        />
        
        {/* Speed marks */}
        {[0, 30, 60, 90, 120].map((mark) => {
          const markAngle = (mark / maxSpeed) * 270 - 135;
          const markAngleRad = (markAngle * Math.PI) / 180;
          const markX1 = centerX + (radius * 0.85) * Math.cos(markAngleRad);
          const markY1 = centerY + (radius * 0.85) * Math.sin(markAngleRad);
          const markX2 = centerX + (radius * 0.95) * Math.cos(markAngleRad);
          const markY2 = centerY + (radius * 0.95) * Math.sin(markAngleRad);
          
          return (
            <line
              key={mark}
              x1={markX1}
              y1={markY1}
              x2={markX2}
              y2={markY2}
              stroke="hsl(var(--foreground))"
              strokeWidth="1"
              opacity="0.6"
            />
          );
        })}
        
        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r="3"
          fill="hsl(var(--foreground))"
        />
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Heading Arrow */}
        {heading !== undefined && (
          <g transform={`translate(${centerX}, ${centerY - radius * 0.3}) rotate(${heading})`}>
            <path
              d="M 0 -8 L -4 4 L 0 0 L 4 4 Z"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--primary-foreground))"
              strokeWidth="1"
            />
          </g>
        )}
      </svg>
      
      <div className="text-center">
        <div className="text-sm font-semibold" style={{ color: speedColor }}>
          {Math.round(speed)} km/h
        </div>
      </div>
    </div>
  );
};

export default SpeedGauge;